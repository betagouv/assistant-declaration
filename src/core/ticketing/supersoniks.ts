import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import slugify from '@sindresorhus/slugify';
import { addDays, addMinutes, addYears, fromUnixTime, getUnixTime, isAfter, isBefore, set, subMonths } from 'date-fns';

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
      let serieId: string;
      let serieName: string;

      if (statement.session.multisession) {
        serieId = statement.session.multisession.multisession_id.toString();
        serieName = statement.session.multisession.title;
      } else {
        serieId = `session_${statement.session.id}`;
        serieName = statement.session.edito.title;
      }

      const serie = series.get(serieId);

      if (!serie) {
        series.set(serieId, {
          name: serieName,
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

        let endDate: Date;
        if (statement.session.end_date !== null) {
          endDate = fromUnixTime(statement.session.end_date);
        } else if (statement.session.settings.duration !== null) {
          endDate = addMinutes(startDate, statement.session.settings.duration);
        } else {
          // Doing as ticketing system Mapado that is setting by default the end date to the end of the night
          endDate = set(addDays(startDate, 1), { hours: 5, minutes: 0, seconds: 0, milliseconds: 0 });
        }

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

        // Detect duplicates before looping to adjust logic from the first duplicate occurence
        const enhancedInternalPrices = statement.internals_prices.map((internalPrice) => {
          // To not mess with slug and multiple occurences having spaces to be trimmed
          const title = internalPrice.title.trim();

          return {
            ...internalPrice,
            title: title,
            slug: slugify(title),
          };
        });

        const renamedTicketCategoriesCounts = new Map<string, number>();
        const slugs = enhancedInternalPrices.map((enhancedInternalPrice) => enhancedInternalPrice.slug);
        const duplicates = slugs.filter((slug, i, arr) => arr.indexOf(slug) !== i);
        const uniqueDuplicates = [...new Set(duplicates)];

        // The Supersoniks logic differs from ours since it exposes a category price per event date
        // whereas we consider it per event serie... We try to merge those that are the same hoping it will work in most case
        for (const enhancedInternalPrice of enhancedInternalPrices) {
          // They do not expose internal ID so we consider using the name as slug
          // but we have in addition to add the serie ID to make it unique during comparaisons (since across series they are likely to have the same name)
          //
          // Also, Supersoniks may list multiple internal prices with the same name for the same session if the price
          // has changed over time so we have to differenciate them since they have different prices
          // Note: we applied the suffix on all (not just 2+) because in case the order change in the API we want the "first one" to be correctly consistently patched
          let fallbackTicketCategoryId: string = `fallback_${serieId}_${enhancedInternalPrice.slug}`;

          if (uniqueDuplicates.includes(enhancedInternalPrice.slug)) {
            const previousOccurencesCount = renamedTicketCategoriesCounts.get(enhancedInternalPrice.slug) ?? 0;
            const currentOccurencesCount = previousOccurencesCount + 1;

            fallbackTicketCategoryId = `${fallbackTicketCategoryId}_${enhancedInternalPrice.amount}`;
            enhancedInternalPrice.title = `${enhancedInternalPrice.title} (n°${currentOccurencesCount})`;

            renamedTicketCategoriesCounts.set(enhancedInternalPrice.slug, currentOccurencesCount);
          }

          let ticketCategory = schemaTicketCategories.find((schemaTicketCategory) => {
            // Will only be true for ticket categories across sessions having 1 price over the serie period
            return (
              schemaTicketCategory.internalTicketingSystemId === fallbackTicketCategoryId &&
              schemaTicketCategory.price === enhancedInternalPrice.amount
            );
          });

          if (ticketCategory) {
            // No event sales for this combo should exist already
            const relatedEventSales = schemaEventSales.find((eventSales) => {
              return (
                eventSales.internalEventTicketingSystemId === statement.session.id.toString() &&
                eventSales.internalTicketCategoryTicketingSystemId === fallbackTicketCategoryId
              );
            });

            assert(!relatedEventSales);
          } else {
            ticketCategory = LiteTicketCategorySchema.parse({
              internalTicketingSystemId: fallbackTicketCategoryId,
              name: enhancedInternalPrice.title,
              description: null,
              price: enhancedInternalPrice.amount,
            });

            schemaTicketCategories.push(ticketCategory);
          }

          schemaEventSales.push(
            LiteEventSalesSchema.parse({
              internalEventTicketingSystemId: statement.session.id.toString(),
              internalTicketCategoryTicketingSystemId: fallbackTicketCategoryId,
              total: enhancedInternalPrice.quantity,
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
