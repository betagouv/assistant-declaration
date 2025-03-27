import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { LiteEventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonAuthResponseSchema } from '@ad/src/models/entities/secutix';

export class SecutixTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://cube.demo-ws.secutix.com/tnai/backend-apis';
  private accessToken: string = '';
  protected readonly itemsPerPageToAvoidPagination: number = 100_000_000;

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  protected formatUrl(subpathname: string): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    return url.toString();
  }

  // protected assertCollectionResponseValid(data: JsonCollectionSchemaType) {
  //   if (!(typeof data['hydra:totalItems'] === 'number' && data['hydra:totalItems'] <= this.itemsPerPageToAvoidPagination)) {
  //     throw new Error('our workaround to avoid handling pagination logic seems to not fit a specific case');
  //   }
  // }

  public async login(): Promise<void> {
    // Since we have a few operations and the token lives for a short time, we don't manage exactly the token lifecycle
    // and just regenerate a new one for each method process
    const requestHeaders = new Headers();
    requestHeaders.append('Content-Type', 'application/json');

    const authResponse = await fetch(this.formatUrl(`/v1/auth`), {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        operator: 'OJ0YSCVW_FLZZCDA03K1JX8J',
        partner: this.accessKey,
        secret: this.secretKey,
      }),
    });

    if (!authResponse.ok) {
      const error = await authResponse.json();

      throw error;
    }

    const authDataJson = await authResponse.json();
    const authData = JsonAuthResponseSchema.parse(authDataJson);

    this.accessToken = authData.token;
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
