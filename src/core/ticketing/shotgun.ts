import slugify from '@sindresorhus/slugify';
import { eachOfLimit } from 'async';
import { addDays, addMinutes, addYears, fromUnixTime, getUnixTime, isAfter, isBefore, set, subMonths } from 'date-fns';

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
import {
  JsonBilletSchemaType,
  JsonGetRepresentationsResponseSchema,
  JsonGetRepresentationsResponseSchemaType,
  JsonGetSpectaclesResponseSchema,
} from '@ad/src/models/entities/shotgun';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class ShotgunTicketingSystemClient implements TicketingSystemClient {
  public baseUrl = 'https://smartboard-api.shotgun.live/api/shotgun';
  protected usingTestEnvironnement = false;

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  public useTestEnvironnement() {
    this.usingTestEnvironnement = true;
    this.baseUrl = 'https://smartboard-api-staging.shotgun.live/api/shotgun';
  }

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    url.search = new URLSearchParams({
      organizer_id: this.accessKey,
      token: this.secretKey,
      ...params,
    }).toString();

    return url.toString();
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection, so using a period range that would return no statement
      const futureDate = addYears(new Date(), 2);

      const soldTicketsResponse = await fetch(
        this.formatUrl(`/tickets/sold`, {
          after: futureDate.toISOString(),
          before: futureDate.toISOString(),
        }),
        { method: 'GET' }
      );

      if (!soldTicketsResponse.ok) {
        const error = await soldTicketsResponse.json();

        throw error;
      }

      const soldTicketsDataJson = await soldTicketsResponse.json();

      const soldTicketsData = JsonGetSpectaclesResponseSchema.parse(soldTicketsDataJson);

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

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {}
}
