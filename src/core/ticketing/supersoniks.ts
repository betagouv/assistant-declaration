import { Client, createClient, createConfig } from '@hey-api/client-fetch';
import { eachOfLimit } from 'async';
import { isAfter, isBefore } from 'date-fns';

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
    // TODO:
    return [];
  }
}
