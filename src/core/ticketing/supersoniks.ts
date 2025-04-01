import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { addDays, addMinutes, addYears, fromUnixTime, getUnixTime, isAfter, isBefore, set, subMonths } from 'date-fns';

import { getClosingStatements } from '@ad/src/client/supersoniks';
import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieWrapperSchemaType,
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
      // We fetch the minimum of information since it's just to test the connection
      // TODO:

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
      query: {
        bypass_closed: true, // Not all organizations are closing their statements
        from: getUnixTime(fromDate),
        to: getUnixTime(apiToDate),
      },
    });

    if (statementsResult.error) {
      throw statementsResult.error;
    }

    const statementsData = JsonGetClosingStatementsResponseSchema.parse(statementsResult.data);

    this.assertCollectionResponseValid(statementsData);

    const seriesStatements: Map<number, JsonStatementSchemaType[]> = new Map();

    // Since everything is indexed by statement (= event statement) we reindex by event series for ease of logic
    for (const statement of statementsData.data) {
      const serieStatements = seriesStatements.get(statement.session.multisession.multisession_id);

      if (!serieStatements) {
        seriesStatements.set(statement.session.multisession.multisession_id, [statement]);
      } else {
        serieStatements.push(statement);
      }
    }

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    for (const [serieId, serieStatements] of seriesStatements) {
      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: LiteTicketCategorySchemaType[] = [];
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      let taxRate: number | null = null;

      for (const statement of serieStatements) {
        const startDate = fromUnixTime(statement.session.start_date);
        const endDate =
          statement.session.end_date !== null
            ? fromUnixTime(statement.session.end_date)
            : addMinutes(startDate, statement.session.settings.duration);

        schemaEvents.push(
          LiteEventSchema.parse({
            internalTicketingSystemId: statement.session.id.toString(),
            startAt: startDate,
            endAt: endDate,
          })
        );

        // Now since internally we manage a unique tax rate per event serie, we make sure all sessions are using the same
        if (taxRate === null) {
          taxRate = statement.session.settings..tax.rate;
        } else if (taxRate !== ticketPrice.tax.rate) {
          // throw new Error(`an event serie should have the same tax rate for all dates and prices`)

          // [WORKAROUND] Until we decide the right way to do, just keep a tax rate not null
          taxRate = Math.max(taxRate, ticketPrice.tax.rate);
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
          name: ticketing.title,
          startAt: serieStartDate,
          endAt: serieEndDate,
          taxRate: taxRate,
        }),
        events: schemaEvents,
        ticketCategories: schemaTicketCategories,
        sales: Array.from(schemaEventSales.values()),
      });
    }

    // TODO:
    // TODO:
    // TODO: consider filtering from/to based on events (not from API request since not possible)
    // TODO:
    // TODO:
    // TODO:
    // TODO: WARNING, there is no way to refetch only statements that have changed it seems...
    // TODO:
    // TODO:

    return eventsSeriesWrappers;
  }
}
