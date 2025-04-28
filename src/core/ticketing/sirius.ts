import slugify from '@sindresorhus/slugify';
import { eachOfLimit } from 'async';
import { addDays, addYears, format, fromUnixTime, isAfter, isBefore, set } from 'date-fns';
import { JSDOM } from 'jsdom';

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
  JsonGetContextResponseSchema,
  JsonListEventsParametersResponseSchema,
  JsonListPricesResponseSchema,
  JsonListReservationsResponseSchema,
} from '@ad/src/models/entities/sirius';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class SiriusTicketingSystemClient implements TicketingSystemClient {
  public readonly baseUrl = 'https://api.forumsirius.fr';
  protected readonly queryParameterDateFormat = 'yyyy-MM-dd HH:mm';

  constructor(
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

  public formatForUniqueness(institutionId: number, input: number | string): string {
    // Since Sirius uniqueness of ID is scoped by customer and not across all of them
    // we have to prefix any internal ID so it will be unique when comparing any entity type from the provider Sirius
    // (this may seem strange but we do this comparaison in case the user removes and adds again the same ticketing credentials, we don't want to all being duplicated)
    return `${institutionId}_${input}`;
  }

  public async login(): Promise<{ institutionId: number; accessToken: string }> {
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

    return { institutionId: contextData.inst, accessToken: contextData.instPA };
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { accessToken } = await this.login();

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
    const { institutionId, accessToken } = await this.login();

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

    const serverJsdom = new JSDOM();
    const domParser = new serverJsdom.window.DOMParser();

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
      const events = Object.values(serieEventsParameters.data.seances);

      assert(eventsSeries.length === 1);

      const eventSerie = eventsSeries[0];

      assert(eventSerie.listeSC.length === events.length);

      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      for (const event of events) {
        assert(eventSerie.listeSC.includes(event.id));

        const startDate = fromUnixTime(event.date);

        // Doing as ticketing system Mapado that is setting by default the end date to the end of the night
        const endDate = set(addDays(startDate, 1), { hours: 5, minutes: 0, seconds: 0, milliseconds: 0 });

        schemaEvents.push(
          LiteEventSchema.parse({
            internalTicketingSystemId: this.formatForUniqueness(institutionId, event.id),
            startAt: startDate,
            endAt: endDate,
          })
        );
      }

      // Now get the ticket categories
      const pricesResponse = await fetch(
        this.formatUrl(`/ListeTarifs`, {
          instPA: accessToken,
          defSC: `SP=${truncatedEventSerie.id}`, // This is their way to scope the search to a serie, not an event
        }),
        { method: 'GET' }
      );

      if (!pricesResponse.ok) {
        const error = await pricesResponse.text();

        throw error;
      }

      const pricesDataJson = await pricesResponse.json();
      const prices = JsonListPricesResponseSchema.parse(pricesDataJson);

      const categoriesNames = new Map<string, string>();

      Object.entries(prices.data.apiLTcat).forEach(([categoryId, category]) => {
        categoriesNames.set(categoryId, category.nomCT.trim());
      });

      // Since for a same serie a ticket category can have different prices among events, we check for duplicates before computing results
      const uniquePriceCombos = new Map<string, number>();
      const duplicatedPriceCombos = new Map<string, number>(); // The value is the count to increment names

      for (const eventPrices of prices.data.grilles) {
        for (const price of eventPrices) {
          const priceCategories = Object.entries(price.px);

          assert(priceCategories.length > 0);

          for (const [priceCategoryId, priceCategoryAmountCents] of priceCategories) {
            const twoPartsTicketCategoryId = `${price.ta}_${priceCategoryId}`;

            const priceComboAmount = uniquePriceCombos.get(twoPartsTicketCategoryId);

            if (priceComboAmount !== undefined) {
              if (priceComboAmount !== priceCategoryAmountCents) {
                // We set 0 since it will be the counter to increment names
                duplicatedPriceCombos.set(twoPartsTicketCategoryId, 0);
              }
            } else {
              uniquePriceCombos.set(twoPartsTicketCategoryId, priceCategoryAmountCents);
            }
          }
        }
      }

      // Now we can process them safely
      for (const eventPrices of prices.data.grilles) {
        for (const price of eventPrices) {
          const priceCategories = Object.entries(price.px);

          for (const [priceCategoryId, priceCategoryAmountCents] of priceCategories) {
            // Unique ID to be retrieved
            const twoPartsTicketCategoryId = `${price.ta}_${priceCategoryId}`;
            let uniqueTicketCategoryId = twoPartsTicketCategoryId;

            // If there is the same combo with a different amount we need to differentiate them and we chose to always suffix them (even the first one)
            let duplicatedComboPreviousOccurencesCount = duplicatedPriceCombos.get(twoPartsTicketCategoryId);
            if (duplicatedComboPreviousOccurencesCount !== undefined) {
              uniqueTicketCategoryId = `${twoPartsTicketCategoryId}_${priceCategoryAmountCents}`;
            }

            let ticketCategory = schemaTicketCategories.get(uniqueTicketCategoryId);

            if (!ticketCategory) {
              // The names are indexed in another property
              const priceName = prices.data.messages[price.nm];

              assert(priceName);

              const categoryName = categoriesNames.get(priceCategoryId);

              assert(categoryName);

              let ticketCategoryName = `${priceName} - ${categoryName}`;

              // Also handle duplicated combos
              if (duplicatedComboPreviousOccurencesCount !== undefined) {
                const currentOccurencesCount = duplicatedComboPreviousOccurencesCount + 1;

                ticketCategoryName = `${ticketCategoryName} (n°${currentOccurencesCount})`;

                // Save the result next occurences
                duplicatedPriceCombos.set(twoPartsTicketCategoryId, currentOccurencesCount);
              }

              ticketCategory = LiteTicketCategorySchema.parse({
                internalTicketingSystemId: this.formatForUniqueness(institutionId, uniqueTicketCategoryId),
                name: ticketCategoryName,
                description: null,
                price: priceCategoryAmountCents / 100, // Since 400 = 4€, we have to convert it
              });

              schemaTicketCategories.set(uniqueTicketCategoryId, ticketCategory);
            } else {
              // Make sure the registered ticket category has the same amount
              assert(ticketCategory.price === priceCategoryAmountCents / 100);
            }
          }
        }
      }

      // Now we go through all tickets of this serie
      const serieReservationsResponse = await fetch(
        this.formatUrl(`/HistoResa`, {
          instPA: accessToken,
          listeSC: eventSerie.listeSC.join(','), // Required, and we cannot target `SP=xxx` so we use all events for this serie
          // Since date range is mandatory, we set it very large to not miss anything
          topMin: format(set(new Date(0), { year: 2010, month: 1, date: 1 }), this.queryParameterDateFormat),
          topMax: format(addYears(new Date(), 1), this.queryParameterDateFormat),
        }),
        { method: 'GET' }
      );

      if (!serieReservationsResponse.ok) {
        const error = await serieReservationsResponse.text();

        throw error;
      }

      const serieReservationsDataJson = await serieReservationsResponse.json();
      const serieReservations = JsonListReservationsResponseSchema.parse(serieReservationsDataJson);

      let taxRate: number | null = null;

      for (const eventForTickets of serieReservations.histo.seances) {
        const inputTaxRate = eventForTickets.taux_tva / 100; // Receiving 2.1 that we manage as 0.021

        if (taxRate === null) {
          taxRate = inputTaxRate;
        } else if (taxRate !== inputTaxRate) {
          // throw new Error(`an event serie should have the same tax rate for all dates`)

          // [WORKAROUND] Until we decide the right way to do, just keep a tax rate not null
          taxRate = Math.max(taxRate, inputTaxRate);
        }

        for (const ticket of eventForTickets.billets) {
          // Only consider tickets that are not cancelled (maybe considered those named "libération")
          // Note: for now we don't know how refunded ones are managed, it's not documented
          if (ticket.etat === 'A') {
            continue;
          }

          // Only consider tickets that have a positive number of places, we don't know yet the meaning of a negative number
          if (ticket.nbPlaces < 0) {
            continue;
          }

          // Retrieve the corresponding ticket category
          const twoPartsTicketCategoryId = `${ticket.id_tarif}_${ticket.id_categorie}`;
          let uniqueTicketCategoryId = twoPartsTicketCategoryId;

          // If this combo has duplications we adjust the unique ID as done to register ticket categories
          let duplicatedComboPreviousOccurencesCount = duplicatedPriceCombos.get(twoPartsTicketCategoryId);
          if (duplicatedComboPreviousOccurencesCount !== undefined) {
            // The Sirius logic is `ticket.montant = ticket.montant_base + ticket.commission`
            // Note: the `ticket.commission` is not reliable because sometimes it's returned as a negative number
            // and sometimes a positive number... So having either `5 = 8 + (-3)` or `5 = 8 - 3`
            // ... if needed to be used we could make it absolute
            const unitTicketPrice = ticket.montant / ticket.nbPlaces; // The `montant` represents the total price for X seats

            // The ticket category amount is defined as cents so we need to adapt to retrieve the ticket category
            const unitTicketPriceCents = unitTicketPrice * 100;

            uniqueTicketCategoryId = `${twoPartsTicketCategoryId}_${unitTicketPriceCents}`;
          }

          const ticketCategory = schemaTicketCategories.get(uniqueTicketCategoryId);

          assert(ticketCategory);

          // Increment category sales
          const uniqueEventSalesId = `${eventForTickets.id}_${ticketCategory.internalTicketingSystemId}`;

          let eventSales = schemaEventSales.get(uniqueEventSalesId);

          // It's weird but Sirius considers a "billet" (ticket) can be for multiple seats, so adjusting the logic here
          if (!eventSales) {
            schemaEventSales.set(
              uniqueEventSalesId,
              LiteEventSalesSchema.parse({
                internalEventTicketingSystemId: this.formatForUniqueness(institutionId, eventForTickets.id),
                internalTicketCategoryTicketingSystemId: ticketCategory.internalTicketingSystemId,
                total: ticket.nbPlaces,
              })
            );
          } else {
            eventSales.total += ticket.nbPlaces;
          }
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

      // The source may be HTML
      const titleDom = domParser.parseFromString(eventSerie.titre, 'text/html');

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: this.formatForUniqueness(institutionId, eventSerie.id),
          name: titleDom.textContent?.trim() ?? slugify(eventSerie.titre),
          startAt: serieStartDate,
          endAt: serieEndDate,
          taxRate: taxRate,
        }),
        events: schemaEvents,
        ticketCategories: Array.from(schemaTicketCategories.values()),
        sales: Array.from(schemaEventSales.values()),
      });
    });

    return eventsSeriesWrappers;
  }
}
