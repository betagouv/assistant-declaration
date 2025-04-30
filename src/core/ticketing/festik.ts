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
} from '@ad/src/models/entities/festik';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export class FestikTicketingSystemClient implements TicketingSystemClient {
  public baseUrl = 'https://www.festik.tools/webservice';
  protected usingTestEnvironnement = false;

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string
  ) {}

  public useTestEnvironnement(subdomain: string) {
    this.usingTestEnvironnement = true;
    this.baseUrl = 'https://dev.festik.tools/webservice';
  }

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

      const spectaclesData = JsonGetSpectaclesResponseSchema.parse(spectaclesDataJson);

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

    const spectaclesData = JsonGetSpectaclesResponseSchema.parse(spectaclesDataJson);

    // Cannot be filtered with `from/to` since we want it to be based on updated tickets
    const spectacles = Object.values(spectaclesData.data);

    const eventsSeriesWrappers: LiteEventSerieWrapperSchemaType[] = [];

    // Get all data to be returned and compared with stored data we have
    // Note: for now we do not parallelize to not flood the ticketing system
    await eachOfLimit(spectacles, 1, async (spectacle) => {
      const schemaEvents: LiteEventSchemaType[] = [];
      const schemaTicketCategories: Map<LiteTicketCategorySchemaType['internalTicketingSystemId'], LiteTicketCategorySchemaType> = new Map();
      const schemaEventSales: Map<
        LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
        LiteEventSalesSchemaType
      > = new Map();

      let taxRate: number | null = null;

      // Festik provides no ticket category ID and they may have the same name with different amounts
      // We have to first loop to detect duplicates so we differenciate them with distinct adjusted names
      const uniquePriceCombos = new Map<string, number>();
      const duplicatedPriceCombos = new Map<string, number>(); // The value is the count to increment names

      const sortedTicketCategoriesPerRepresentationId: Map<number, JsonBilletSchemaType[]> = new Map();

      // We have to go through each representation (= event) to get details
      for (const representation of Object.values(spectacle.representations)) {
        const startDate = fromUnixTime(representation.start);

        // Festik does not provide the end date so doing as ticketing system Mapado that is setting by default the end date to the end of the night
        const endDate = set(addDays(startDate, 1), { hours: 5, minutes: 0, seconds: 0, milliseconds: 0 });

        schemaEvents.push(
          LiteEventSchema.parse({
            internalTicketingSystemId: representation.id_representation.toString(),
            startAt: startDate,
            endAt: endDate,
          })
        );

        // Now retrieve information about ticketing
        const representationResponse = await fetch(
          this.formatUrl(`/declaration/representation/${this.accessKey}/${this.secretKey}/${representation.id_representation}/`),
          { method: 'GET' }
        );

        if (!representationResponse.ok) {
          const error = await representationResponse.json();

          throw error;
        }

        const representationDataJson = await representationResponse.json();

        // In their test environment some representations may be listed in the first endpoint while not existing
        // in the second... Since they set all values to `null`, we have to skip them to make our parsing working for tests
        // (it's probably just corrupted fake data, it would have no sense of this in production)
        if (this.usingTestEnvironnement && representationDataJson.spectacle.id === null) {
          continue;
        }

        const representationData = JsonGetRepresentationsResponseSchema.parse(representationDataJson);

        // Free and paid tickets can be processed as the same
        let ticketCategories = representationData.declaration.billets.gratuits.concat(representationData.declaration.billets.payants);

        // In their test environment they have negative value they can't explain, they suggest it's just weird fake data
        // so we just skip them for now, hoping it's not happening in production
        if (this.usingTestEnvironnement) {
          ticketCategories = ticketCategories.filter((ticketCategory) => {
            return ticketCategory.prix_unitaire_ttc >= 0;
          });
        }

        // We sort them to reduce the risk of adjusted name changes when prices will be stable (event serie fully ended)
        const sortedTicketCategories = ticketCategories.sort((a, b) => a.prix_unitaire_ttc - b.prix_unitaire_ttc);

        for (const rawTicketCategory of sortedTicketCategories) {
          const onePartTicketCategoryId = slugify(rawTicketCategory.tarif); // `tarif` is the name

          const priceComboAmount = uniquePriceCombos.get(onePartTicketCategoryId);

          if (priceComboAmount !== undefined) {
            if (priceComboAmount !== rawTicketCategory.prix_unitaire_ttc) {
              // We set 0 since it will be the counter to increment names
              duplicatedPriceCombos.set(onePartTicketCategoryId, 0);
            }
          } else {
            uniquePriceCombos.set(onePartTicketCategoryId, rawTicketCategory.prix_unitaire_ttc);
          }
        }

        // Due to the fallback about ticket category names the rest will be done in another loop with the whole context of duplication
        sortedTicketCategoriesPerRepresentationId.set(representation.id_representation, sortedTicketCategories);
      }

      for (const [representationId, sortedTicketCategories] of sortedTicketCategoriesPerRepresentationId) {
        // Now we can reprocess safely while knowing all duplicates
        for (const rawTicketCategory of sortedTicketCategories) {
          // Unique ID to be retrieved
          const onePartTicketCategoryId = slugify(rawTicketCategory.tarif);
          let uniqueTicketCategoryId = onePartTicketCategoryId;

          // If there is the same combo with a different amount we need to differentiate them and we chose to always suffix them (even the first one)
          let duplicatedComboPreviousOccurencesCount = duplicatedPriceCombos.get(onePartTicketCategoryId);
          if (duplicatedComboPreviousOccurencesCount !== undefined) {
            uniqueTicketCategoryId = `${onePartTicketCategoryId}_${rawTicketCategory.prix_unitaire_ttc}`;
          }

          let ticketCategory = schemaTicketCategories.get(uniqueTicketCategoryId);

          if (!ticketCategory) {
            let ticketCategoryName = rawTicketCategory.tarif;

            // Also handle duplicated combos
            if (duplicatedComboPreviousOccurencesCount !== undefined) {
              const currentOccurencesCount = duplicatedComboPreviousOccurencesCount + 1;

              ticketCategoryName = `${ticketCategoryName} (n°${currentOccurencesCount})`;

              // Save the result next occurences
              duplicatedPriceCombos.set(onePartTicketCategoryId, currentOccurencesCount);
            }

            ticketCategory = LiteTicketCategorySchema.parse({
              internalTicketingSystemId: uniqueTicketCategoryId,
              name: ticketCategoryName,
              description: null,
              price: rawTicketCategory.prix_unitaire_ttc, // It's already a float
            });

            schemaTicketCategories.set(uniqueTicketCategoryId, ticketCategory);
          } else {
            // Make sure the registered ticket category has the same amount
            assert(ticketCategory.price === rawTicketCategory.prix_unitaire_ttc);
          }

          // Increment category sales
          const uniqueEventSalesId = `${representationId}_${ticketCategory.internalTicketingSystemId}`;

          const eventSales = schemaEventSales.get(uniqueEventSalesId);

          if (!eventSales) {
            schemaEventSales.set(
              uniqueEventSalesId,
              LiteEventSalesSchema.parse({
                internalEventTicketingSystemId: representationId.toString(),
                internalTicketCategoryTicketingSystemId: ticketCategory.internalTicketingSystemId,
                total: rawTicketCategory.nb_billets_vendus,
              })
            );
          } else {
            eventSales.total += rawTicketCategory.nb_billets_vendus;
          }

          // Since internally we manage a unique tax rate per event serie, we make sure all sessions and ticket categories are using the same
          if (taxRate === null) {
            taxRate = rawTicketCategory.taux_tva;
          } else if (taxRate !== rawTicketCategory.taux_tva) {
            throw new Error(`an event serie should have the same tax rate for all sessions of a serie`);

            // // [WORKAROUND] Until we decide the right way to do, just keep a tax rate not null
            // taxRate = Math.max(taxRate, rawTicketCategory.taux_tva);
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

      eventsSeriesWrappers.push({
        serie: LiteEventSerieSchema.parse({
          internalTicketingSystemId: spectacle.id_spectacle.toString(),
          name: spectacle.name,
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
