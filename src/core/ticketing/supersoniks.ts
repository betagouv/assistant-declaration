import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import slugify from '@sindresorhus/slugify';
import { addMinutes, addYears, fromUnixTime, getUnixTime, subMonths } from 'date-fns';

import { getClosingStatements } from '@ad/src/client/supersoniks';
import { getExcludingTaxesAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSchema, LiteEventSchemaType, LiteEventSerieSchema, LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonCollectionSchemaType, JsonGetClosingStatementsResponseSchema, JsonStatementSchemaType } from '@ad/src/models/entities/supersoniks';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class SupersoniksTicketingSystemClient implements TicketingSystemClient {
  protected readonly client: Client;
  protected readonly publicIdentifier: string;
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;

  constructor(accessKey: string, secretKey: string) {
    // To avoid complexifying our common logic between ticketing systems we reuse the "username" as domain name
    // since Supersoniks is not having a shared API for all its customers

    // Test it's valid (it should since we made a specific validation at form submission)
    const baseUrl = new URL(`https://${accessKey}/api/v2/`);

    this.client = createClient(
      createConfig({
        baseUrl: baseUrl.toString(),
        auth: secretKey,
      })
    );

    this.publicIdentifier = slugify(accessKey);
  }

  public formatForUniqueness(input: string): string {
    // Since Supersoniks uniqueness of ID is scoped by customer and not across all of them
    // we have to prefix any internal ID so it will be unique when comparing any entity type from the provider Supersoniks
    // (this may seem strange but we do this comparaison in case the user removes and adds again the same ticketing credentials, we don't want to all being duplicated)
    return `${this.publicIdentifier}_${input}`;
  }

  protected assertCollectionResponseValid(data: JsonCollectionSchemaType) {
    if (!data.success) {
      throw new Error('supersoniks does not consider the response as successful');
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection, so using a period range that would return no statement
      const futureDate = addYears(new Date(), 2);

      const statementsResult = await getClosingStatements({
        client: this.client,
        query: {
          bypass_closed: true,
          from: getUnixTime(futureDate),
          to: getUnixTime(futureDate),
        },
      });

      if (statementsResult.error) {
        throw statementsResult.error;
      }

      const statementsData = JsonGetClosingStatementsResponseSchema.parse(statementsResult.data);

      this.assertCollectionResponseValid(statementsData);

      return true;
    } catch (error) {
      // [IMPORTANT] Sometimes having "Bearer token expired\/invalid" means for this specific Supersoniks customer the firewall is complaining
      // If the IP has been correctly authorized, forcing IPv4 would do the trick but there is no easy way
      // on the generated client we can configure (like Agent/Dispatcher), so it's better to rely only on a more abstract way by using:
      // `NODE_OPTIONS=--dns-result-order=ipv4first`
      // Note: it should not be an issue on our provider since it also manage IPv4 for know, this trick is only for specific debugs locally
      return false;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // The API will manage `from` according to events and not last modifications so we fetch all data to not miss anything
    // (still we limit it in the past since the first synchronization cannot go more than ~1 year in the past)
    const apiFromDate = subMonths(new Date(), 13);

    // By default the API does not return ongoing statements (which is helpful for us in the UI), so increase the window to fetch them
    const apiToDate = toDate ?? addYears(new Date(), 1);

    const statementsResult = await getClosingStatements({
      client: this.client,
      query: {
        bypass_closed: true, // Not all organizations are closing their statements
        from: getUnixTime(apiFromDate),
        to: getUnixTime(apiToDate),
      },
    });

    if (statementsResult.error) {
      throw statementsResult.error;
    }

    const statementsData = JsonGetClosingStatementsResponseSchema.parse(statementsResult.data);

    this.assertCollectionResponseValid(statementsData);

    // [IMPORTANT]
    // Since the API period range is not working on last purchased tickets, and since there is no detail of tickets list
    // we cannot properly use the period range. To mimic it a bit and avoid comparing past series that won't change
    // we could make the assumption of those not changing with a margin but in fact we cannot use a little margin
    // on the start date because the serie can be "on sale" months/years before, and the end date is too risky for long running
    // series even with margins, so just relying first requests filter on the statements

    const series: Map<
      string,
      {
        name: string;
        statements: JsonStatementSchemaType[];
      }
    > = new Map();

    // Since everything is indexed by statement (= event statement) we reindex by event series for ease of logic
    for (const statement of statementsData.data) {
      // `multisession` means it exists a serie of sessions (to find among all statements)
      // If there is none, we consider the session itself as a serie
      let nonUniqueSerieId: string;
      let serieName: string;

      if (statement.session.multisession) {
        nonUniqueSerieId = statement.session.multisession.multisession_id.toString();
        serieName = statement.session.multisession.title;
      } else {
        nonUniqueSerieId = `session_${statement.session.id}`;
        serieName = statement.session.edito.title;
      }

      const serie = series.get(nonUniqueSerieId);

      if (!serie) {
        series.set(nonUniqueSerieId, {
          name: serieName,
          statements: [statement],
        });
      } else {
        serie.statements.push(statement);
      }
    }

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    for (const [nonUniqueSerieId, serie] of series) {
      const schemaEvents: LiteEventSchemaType[] = [];

      for (const statement of serie.statements) {
        // Only consider event type (we did not face another type for now, but just in case)
        if (statement.session.entity_type !== 'event') {
          continue;
        }

        const uniqueSessionId = this.formatForUniqueness(statement.session.id.toString());

        const startDate = fromUnixTime(statement.session.start_date);

        let endDate: Date | null;
        if (statement.session.end_date !== null) {
          endDate = fromUnixTime(statement.session.end_date);
        } else if (statement.session.settings.duration !== null) {
          endDate = addMinutes(startDate, statement.session.settings.duration);
        } else {
          endDate = null;
        }

        const schemaEvent = LiteEventSchema.parse({
          internalTicketingSystemId: uniqueSessionId,
          startAt: startDate,
          endAt: endDate,
          ticketingRevenueIncludingTaxes: 0,
          ticketingRevenueExcludingTaxes: 0,
          ticketingRevenueTaxRate: statement.session.settings.tax.rate,
          freeTickets: 0,
          paidTickets: 0,
        });

        // Supersoniks allow selling on partner platforms like FNAC/Digitick/Ticketmaster... so we look at those too
        // but we skip partial reimbursements from Supersoniks for now (see details below)
        const allPrices = statement.internals_prices.concat(statement.externals_prices).filter((price) => {
          // [IMPORTANT] Supersoniks allows partial reimbursement, which will appear as a separate price entry
          // as a sum of all partial reimbursements for a specific price (even if different amounts refunded).
          // There is no way to know how they are splitted since the quantity is always 0 (for Supersoniks to keep accountability clear since it's not a full refund).
          // For now we just ignore those for declarations until we have more thoughts from users on this
          if (price.amount >= 0) {
            assert(price.revenue >= 0);

            return true;
          }

          return false;
        });

        for (const price of allPrices) {
          // TODO: are reductions accounted into `price.revenue`? Or within "prices" above that can be negative? Need to check with the Supersoniks team...
          const ticketCategoryIncludingTaxes = price.amount;

          if (ticketCategoryIncludingTaxes === 0) {
            schemaEvent.freeTickets += price.quantity;
          } else {
            schemaEvent.paidTickets += price.quantity;
            schemaEvent.ticketingRevenueIncludingTaxes += price.revenue; // Excluding taxes will be calculated on the total since constant for a same event
          }
        }

        schemaEvent.ticketingRevenueExcludingTaxes = getExcludingTaxesAmountFromIncludingTaxesAmount(
          schemaEvent.ticketingRevenueIncludingTaxes,
          schemaEvent.ticketingRevenueTaxRate ?? 0
        );

        schemaEvents.push(schemaEvent);
      }

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: this.formatForUniqueness(nonUniqueSerieId),
          name: serie.name,
        }),
        events: schemaEvents,
      });
    }

    return eventsSeriesWrappers;
  }
}
