import { eachOfLimit } from 'async';
import { addYears, getUnixTime, subMonths } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonGetRepresentationsResponseSchema, JsonGetSpectaclesResponseSchema } from '@ad/src/models/entities/festik';

export class FestikTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://dev.festik.tools/webservice';

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    return url.toString();
  }

  public async testConnection(): Promise<boolean> {
    try {
      // We fetch the minimum of information since it's just to test the connection, so using a period range that would return no statement
      const futureDate = addYears(new Date(), 2);

      const spectaclesResponse = await fetch(
        this.formatUrl(`/declaration/billetterie/${this.accessKey}/${this.secretKey}/${getUnixTime(futureDate)}/${getUnixTime(futureDate)}/`),
        { method: 'GET' }
      );

      if (!spectaclesResponse.ok) {
        const error = await spectaclesResponse.json();

        throw error;
      }

      const spectaclesDataJson = await spectaclesResponse.json();

      const spectaclesData = JsonGetSpectaclesResponseSchema.parse(spectaclesDataJson.data);

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

    // We increase the window to fetch them future events
    const apiToDate = toDate ?? addYears(new Date(), 1);

    const spectaclesResponse = await fetch(
      this.formatUrl(`/declaration/billetterie/${this.accessKey}/${this.secretKey}/${getUnixTime(apiFromDate)}/${getUnixTime(apiToDate)}/`),
      { method: 'GET' }
    );

    if (!spectaclesResponse.ok) {
      const error = await spectaclesResponse.json();

      throw error;
    }

    const spectaclesDataJson = await spectaclesResponse.json();

    const spectaclesData = JsonGetSpectaclesResponseSchema.parse(spectaclesDataJson.data);

    // Cannot be filtered with `from/to` since we want it to be based on updated tickets
    const spectacles = Object.values(spectaclesData.data);

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(spectacles, 1, async (spectacle) => {
      // We have to go through each representation (= event) to get details
      for (const representation of Object.values(spectacle.representations)) {
        // TODO:
        // TODO:
        // TODO: wait to know if specific endpoint for CRMs as mentioned by Festik
        // TODO:
      }

      const spectacleResponse = await fetch(
        this.formatUrl(`/declaration/representation/${this.accessKey}/${this.secretKey}/${spectacle.id_spectacle}/`),
        { method: 'GET' }
      );

      if (!spectacleResponse.ok) {
        const error = await spectacleResponse.json();

        throw error;
      }

      const spectacleDataJson = await spectacleResponse.json();

      const spectacleData = JsonGetRepresentationsResponseSchema.parse(spectacleDataJson.data);
    });

    return eventsSeriesWrappers;
  }
}
