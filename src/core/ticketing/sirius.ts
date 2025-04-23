import slugify from '@sindresorhus/slugify';
import { eachOfLimit } from 'async';
import { addYears, format, isAfter, isBefore } from 'date-fns';

import { TicketingSystemClient } from '@ad/src/core/ticketing/common';
import {
  LiteEventSalesSchemaType,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieWrapperSchemaType,
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import {
  JsonGetContextResponseSchema,
  JsonListEventsParametersResponseSchema,
  JsonListReservationsResponseSchema,
} from '@ad/src/models/entities/sirius';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class SiriusTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://api.forumsirius.fr';
  protected readonly publicIdentifier: string;
  protected readonly queryParameterDateFormat = 'yyyy-MM-dd HH:mm';

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {
    this.publicIdentifier = slugify(accessKey);
  }

  protected formatUrl(subpathname: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${subpathname}`);

    url.search = new URLSearchParams({
      ...params,
    }).toString();

    return url.toString();
  }

  public formatForUniqueness(input: string): string {
    // Since Sirius uniqueness of ID is scoped by customer and not across all of them
    // we have to prefix any internal ID so it will be unique when comparing any entity type from the provider Sirius
    // (this may seem strange but we do this comparaison in case the user removes and adds again the same ticketing credentials, we don't want to all being duplicated)
    return `${this.publicIdentifier}_${input}`;
  }

  public async login(): Promise<string> {
    const contextResponse = await fetch(
      this.formatUrl(`/Contexte`, {
        inst: this.accessKey,
        session: this.secretKey,
      }),
      { method: 'GET' }
    );

    if (!contextResponse.ok) {
      const error = await contextResponse.text();

      throw error;
    }

    const contextDataJson = await contextResponse.json();
    const contextData = JsonGetContextResponseSchema.parse(contextDataJson);

    return contextData.instPA;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.login();

      // We fetch the minimum of information since it's just to test the connection, so using a period range that would return no statement
      const futureDate = addYears(new Date(), 2);

      const reservationsResponse = await fetch(
        this.formatUrl(`/HistoResa`, {
          instPA: accessToken,
          listeSC: '*', // Required, so targeting all events
          topMin: format(futureDate, this.queryParameterDateFormat),
          topMax: format(futureDate, this.queryParameterDateFormat),
        }),
        { method: 'GET' }
      );

      if (!reservationsResponse.ok) {
        const error = await reservationsResponse.text();

        throw error;
      }

      const reservationsDataJson = await reservationsResponse.json();
      const reservations = JsonListReservationsResponseSchema.parse(reservationsDataJson);

      return true;
    } catch (error) {
      throw error;
    }
  }

  public async getEventsSeries(fromDate: Date, toDate?: Date): Promise<LiteEventSerieWrapperSchemaType[]> {
    const accessToken = await this.login();

    const recentReservationsResponse = await fetch(
      this.formatUrl(`/HistoResa`, {
        instPA: accessToken,
        listeSC: '*', // Required, so targeting all events
        topMin: format(fromDate, this.queryParameterDateFormat),
        topMax: format(toDate ?? addYears(new Date(), 2), this.queryParameterDateFormat),
      }),
      { method: 'GET' }
    );

    if (!recentReservationsResponse.ok) {
      const error = await recentReservationsResponse.text();

      throw error;
    }

    const recentReservationsDataJson = await recentReservationsResponse.json();
    const recentReservations = JsonListReservationsResponseSchema.parse(recentReservationsDataJson);

    const eventsIdsToSynchronize: number[] = recentReservations.histo.seances.map((seance) => seance.id);

    // From here we don't have the events series IDs, so we have to fetch them from the events IDs we have
    const recentEventsParametersResponse = await fetch(
      this.formatUrl(`/ParamSC`, {
        instPA: accessToken,
        defSC: eventsIdsToSynchronize.join(','),
      }),
      { method: 'GET' }
    );

    if (!recentEventsParametersResponse.ok) {
      const error = await recentEventsParametersResponse.text();

      throw error;
    }

    const recentEventsParametersDataJson = await recentEventsParametersResponse.json();
    const recentEventsParameters = JsonListEventsParametersResponseSchema.parse(recentEventsParametersDataJson);

    const truncatedEventsSeries = Object.values(recentEventsParameters.data.spectacles);

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(truncatedEventsSeries, 1, async (truncatedEventSerie) => {
      // `eventSerie.listeSC` for whatever reason is only listing the "seances" (events) that are requested
      // as parameter whereas it should list all of a serie despite the filter parameter. So fetching them fully
      const serieEventsParametersResponse = await fetch(
        this.formatUrl(`/ParamSC`, {
          instPA: accessToken,
          defSC: `SP=${truncatedEventSerie.id}`, // This is their way to scope the search to a serie, not an event
        }),
        { method: 'GET' }
      );

      if (!serieEventsParametersResponse.ok) {
        const error = await serieEventsParametersResponse.text();

        throw error;
      }

      const serieEventsParametersDataJson = await serieEventsParametersResponse.json();
      const serieEventsParameters = JsonListEventsParametersResponseSchema.parse(serieEventsParametersDataJson);

      const eventsSeries = Object.values(serieEventsParameters.data.spectacles);

      assert(eventsSeries.length === 1);

      const eventSerie = eventsSeries[0];

      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: LiteTicketCategorySchemaType[] = [];
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      // TODO:
      // TODO:
      // TODO:
      // TODO:
      // TODO:
      // TODO:
      // TODO:
      // TODO:

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
          internalTicketingSystemId: xx,
          name: ticketing.title,
          startAt: serieStartDate,
          endAt: serieEndDate,
          taxRate: taxRate,
        }),
        events: schemaEvents,
        ticketCategories: schemaTicketCategories,
        sales: Array.from(schemaEventSales.values()),
      });
    });

    return eventsSeriesWrappers;
  }
}
