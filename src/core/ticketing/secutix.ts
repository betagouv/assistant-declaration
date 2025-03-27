import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { eachOfLimit } from 'async';
import { addYears, getUnixTime, isAfter, isBefore } from 'date-fns';

import { getEventDateCollection, getTicketCollection, getTicketingCollection } from '@ad/src/client/mapado';
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
import { JsonCollectionSchemaType } from '@ad/src/models/entities/mapado';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class SecutixTicketingSystemClient implements TicketingSystemClient {
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
    if (!(typeof data['hydra:totalItems'] === 'number' && data['hydra:totalItems'] <= this.itemsPerPageToAvoidPagination)) {
      throw new Error('our workaround to avoid handling pagination logic seems to not fit a specific case');
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
    // // By default the API does not return ongoing statements (which is helpful for us in the UI), so increase the window to fetch them
    // const appropriateToDate = toDate ?? addYears(new Date(), 1);

    // const statementsResult = await getClosingStatements({
    //   query: {
    //     bypass_closed: true, // Not all organizations are closing their statements
    //     from: getUnixTime(fromDate),
    //     to: getUnixTime(appropriateToDate),
    //   },
    // });

    // if (statementsResult.error) {
    //   throw statementsResult.error;
    // }

    // const statementsData = JsonGetRecentTicketsResponseSchema.parse(statementsResult.data);

    // this.assertCollectionResponseValid(statementsData);

    // console.log(JSON.stringify(statementsData));

    // TODO:
    // TODO:
    // TODO:
    // TODO: WARNING, there is no way to refetch only statements that have changed it seems...
    // TODO:
    // TODO:

    return [];
  }
}
