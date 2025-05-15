import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';

export class YurplanTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://api.yurplan.com/v1/token';

  constructor(
    private readonly partnerClientId: string,
    private readonly partnerClientSecret: string,
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    url.search = new URLSearchParams({
      ...params,
    }).toString();

    return url.toString();
  }

  public async testConnection(): Promise<boolean> {
    try {
      // TODO

      return true;
    } catch (error) {
      throw error;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    // TODO

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    return eventsSeriesWrappers;
  }
}
