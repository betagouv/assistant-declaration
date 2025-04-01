import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import slugify from '@sindresorhus/slugify';
import { addMinutes, addYears, fromUnixTime, getUnixTime, isAfter, isBefore, subMonths } from 'date-fns';

import { getClosingStatements } from '@ad/src/client/supersoniks';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  LiteEventSalesSchema,
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchema,
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import { JsonCollectionSchemaType, JsonGetClosingStatementsResponseSchema, JsonStatementSchemaType } from '@ad/src/models/entities/supersoniks';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class SupersoniksTicketingSystemClient implements TicketingSystemClient {
  protected readonly client: Client;
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;

  constructor(secretKey: string) {
    this.client = createClient(
      createConfig({
        baseUrl: 'https://ticketing.mapado.net/',
        auth: secretKey,
      })
    );
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
      number,
      {
        name: string;
        statements: JsonStatementSchemaType[];
      }
    > = new Map();

    // Since everything is indexed by statement (= event statement) we reindex by event series for ease of logic
    for (const statement of statementsData.data) {
      const serie = series.get(statement.session.multisession.multisession_id);

      if (!serie) {
        series.set(statement.session.multisession.multisession_id, {
          name: statement.session.multisession.title,
          statements: [statement],
        });
      } else {
        serie.statements.push(statement);
      }
    }

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    for (const [serieId, serie] of series) {
      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: LiteTicketCategorySchemaType[] = [];
      const schemaEventSales: LiteEventSalesSchemaType[] = [];

      let taxRate: number | null = null;

      for (const statement of serie.statements) {
        // Only consider event type (we did not face another type for now, but just in case)
        if (statement.session.entity_type !== 'event') {
          continue;
        }

        const startDate = fromUnixTime(statement.session.start_date);
        const endDate =
          statement.session.end_date !== null ? fromUnixTime(statement.session.end_date) : addMinutes(startDate, statement.session.settings.duration);

        schemaEvents.push(
          LiteEventSchema.parse({
            internalTicketingSystemId: statement.session.id.toString(),
            startAt: startDate,
            endAt: endDate,
          })
        );

        // Now since internally we manage a unique tax rate per event serie, we make sure all sessions are using the same
        if (taxRate === null) {
          taxRate = statement.session.settings.tax.rate;
        } else if (taxRate !== statement.session.settings.tax.rate) {
          // throw new Error(`an event serie should have the same tax rate for all sessions of a serie`)

          // [WORKAROUND] Until we decide the right way to do, just keep a tax rate not null
          taxRate = Math.max(taxRate, statement.session.settings.tax.rate);
        }

        // The Supersoniks logic differs from ours since it exposes a category price per event date
        // whereas we consider it per event serie... We try to merge those that are the same hoping it will work in most case
        for (const internalPrice of statement.internals_prices) {
          // They do not expose internal ID so we consider using the name as slug
          const ticketCategoryId = slugify(internalPrice.title);

          let ticketCategory = schemaTicketCategories.find((schemaTicketCategory) => {
            return schemaTicketCategory.internalTicketingSystemId === ticketCategoryId;
          });

          if (ticketCategory) {
            // Since we rely a guessed ID (from name), we want to make sure it's working all the time
            assert(internalPrice.title === ticketCategory.name && internalPrice.amount === ticketCategory.price);
          } else {
            ticketCategory = LiteTicketCategorySchema.parse({
              internalTicketingSystemId: ticketCategoryId,
              name: internalPrice.title,
              description: null,
              price: internalPrice.amount,
            });

            schemaTicketCategories.push(ticketCategory);
          }

          schemaEventSales.push(
            LiteEventSalesSchema.parse({
              internalEventTicketingSystemId: statement.session.id.toString(),
              internalTicketCategoryTicketingSystemId: ticketCategoryId,
              total: internalPrice.quantity,
            })
          );
        }
      }

      // Calculate the date range for the event serie
      let serieStartDate: Date | null = null;
      let serieEndDate: Date | null = null;

      for (const schemaEvent of schemaEvents) {
        if (serieStartDate === null || isBefore(schemaEvent.startAt, serieStartDate)) {
          serieStartDate = schemaEvent.startAt;
        }

        if (serieEndDate === null || isAfter(schemaEvent.endAt, serieEndDate)) {
          serieEndDate = schemaEvent.endAt;
        }
      }

      assert(serieStartDate !== null && serieEndDate !== null);
      assert(taxRate !== null);

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: serieId.toString(),
          name: serie.name,
          startAt: serieStartDate,
          endAt: serieEndDate,
          taxRate: taxRate,
        }),
        events: schemaEvents,
        ticketCategories: schemaTicketCategories,
        sales: Array.from(schemaEventSales.values()),
      });
    }

    return eventsSeriesWrappers;
  }
}
