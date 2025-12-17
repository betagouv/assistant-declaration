import { Mutex } from 'async-mutex';

import {
  authorizeUsingPost,
  createDeclarationUsingPost1,
  getAllDomaineRepresentationsUsingGet1,
  getAllTypesLieuUsingGet1,
} from '@ad/src/client/sibil';
import { Client, createClient, createConfig } from '@ad/src/client/sibil/client';
import { getFlattenEventsForSibilDeclaration } from '@ad/src/core/declaration/format';
import { SibilDeclarationSchemaType } from '@ad/src/models/entities/declaration/sibil';
import { sibilWrongCredentialsError } from '@ad/src/models/entities/errors';
import { PerformanceTypeSchema, PerformanceTypeSchemaType } from '@ad/src/models/entities/event';
import {
  JsonCreateDeclarationResponseSchema,
  JsonErrorResponseSchema,
  JsonFailedLoginResponseSchema,
  JsonPerformanceTypesResponseSchema,
  JsonPlaceTypeSchema,
  JsonPlaceTypesResponseSchema,
  JsonSuccessfulLoginResponseSchema,
} from '@ad/src/models/entities/sibil';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { formatMaskedValue, officialIdMask } from '@ad/src/utils/imask';
import { sleep } from '@ad/src/utils/sleep';

export interface SibilClientInterface {
  login(): Promise<void>;
  logout(): Promise<void>;
  test(): Promise<void>;
  declare(declaration: SibilDeclarationSchemaType): Promise<void>;
}

export function getSibilClient(userId: string, sibilUsername: string, sibilPassword: string): SibilClientInterface {
  if (
    process.env.APP_MODE !== 'prod' &&
    (!process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS || !process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS.split(',').includes(userId))
  ) {
    return new MockSibilClient();
  } else {
    return new SibilClient(sibilUsername, sibilPassword);
  }
}

export class SibilClient implements SibilClientInterface {
  protected static readonly performanceTypesMutex = new Mutex();
  protected static performanceTypes: { [K in PerformanceTypeSchemaType]: number } | null = null;

  protected readonly baseUrl: string = process.env.SIBIL_API_BASE_URL || 'https://nowhere';
  protected readonly client: Client;
  protected readonly commonHeaders: HeadersInit = new Headers({
    'User-Agent': 'assistant-declaration', // Help them in case of analyses
  });
  protected accessToken: string | null = null;

  constructor(
    protected readonly username: string,
    protected readonly password: string
  ) {
    this.client = createClient(
      createConfig({
        baseUrl: this.baseUrl,
        headers: this.commonHeaders,
      })
    );
  }

  public loggedIn(): boolean {
    return this.accessToken !== null;
  }

  public async login() {
    const loginResult = await authorizeUsingPost({
      client: this.client,
      body: {
        username: this.username,
        password: this.password,
      },
    });

    if (loginResult.error) {
      const failedLoginData = JsonFailedLoginResponseSchema.safeParse(loginResult.data);

      // If we are sure that's SIBIL data about wrong credentials, we can throw a formatted error
      if (!failedLoginData.success) {
        throw sibilWrongCredentialsError;
      }

      throw loginResult.error;
    }

    const loginData = JsonSuccessfulLoginResponseSchema.parse(loginResult.data);

    this.accessToken = loginData.id_token;

    // We wanted to use the `auth` property but it's not working as expected
    this.client.setConfig({
      headers: {
        ...this.commonHeaders,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  public async logout() {
    if (!this.accessToken) {
      return;
    }

    // Currently there is no endpoint to invalid the access token, so just forgetting it locally

    this.accessToken = null;

    this.client.setConfig({
      headers: this.commonHeaders, // Reset `Authorization` header
    });
  }

  public async test() {
    assert(this.accessToken);

    const placeTypesResult = await getAllTypesLieuUsingGet1({
      client: this.client,
    });

    if (placeTypesResult.error) {
      throw placeTypesResult.error;
    }

    const placeTypesData = JsonPlaceTypesResponseSchema.parse(placeTypesResult.data);
  }

  public async declare(declaration: SibilDeclarationSchemaType) {
    assert(this.accessToken);
    assert(declaration.events.length > 0);

    // This is the only field requiring an "unguessable" internal ID from their side
    const sibilPerformanceTypesMapping = await this.retrievePerformanceTypesMapping();
    const performanceTypeId = sibilPerformanceTypesMapping[declaration.eventSerie.performanceType];

    //
    // [IMPORTANT]
    // SIBIL system logic is to analyze events series by quarters, so if any serie is accross 2 quarters
    // the declaration request will fail. We had 2 solutions, either if across X quarters we try to split
    // in X fragments. But it implies knowing exactly how they calculate thresholds (first of the month? which hour? which timezone?)
    // ... it looks simple but it's note, it's error prone for the future
    // To avoid complexity we chose to never make a declaration for multiple events at once, but rather to declare for each event
    //
    // Hopefully it helps also for the place where it's played, but also the capacity of a place
    // They accept just 1 place per serie, but the reality is a serie can be performed at different locations,
    // and that's how declarants declare elsewhere. So it confirms a bit our idea of unicity in all cases
    // since by summing up some tricky cases, it would result in a complex split for no added value
    //
    // Note that in both cases since there are potentially multiple requests, and one of them can fail, requiring from us
    // to not create again the same declaration fragment... To do so we rely on an "internal ID" put their system, and after
    // testing we notice there is no way to get all existing and compare with the ones to push since they rely on this
    // `idExtBilletterie` field to update any existing one
    //

    const flattenEvents = getFlattenEventsForSibilDeclaration(declaration);

    // Order events for the ease when debugging
    const ascendingFlattenEvents = flattenEvents.sort((a, b) => +a.startAt - +b.startAt);

    for (const flattenEvent of ascendingFlattenEvents) {
      const createDeclarationResult = await createDeclarationUsingPost1({
        client: this.client,
        body: {
          idExtBilletterie: `${declaration.eventSerie.id.slice(0, 8)}_${flattenEvent.id.slice(0, 8)}`, // Passing both the full UUID is rejected by SIBIL, so just using the first part of them is fine enough for the randomness normally (we could try to extend the limit until it fails)
          gestionnaireMultiple: false,
          dateHeureRepresentationUnique: flattenEvent.startAt.toString(), // SIBIL respects ISO format,
          dateDebut: undefined, // Only for multiple events
          dateFin: undefined, // Only for multiple events
          nbRepresentations: 1,
          nbBilletsTotalBilletterie: flattenEvent.paidTickets + flattenEvent.freeTickets,
          recetteTotalBilletterie: flattenEvent.ticketingRevenueIncludingTaxes,
          prixMoyenTotalBilletterie: flattenEvent.ticketingRevenueIncludingTaxes / flattenEvent.paidTickets,
          nbBilletsTarifPlein: 0,
          recetteTarifPlein: 0,
          prixMoyenTarifPlein: 0,
          nbBilletsTarifAbonnementForfait: 0,
          nbBilletsExoneres: flattenEvent.freeTickets,
          jauge: flattenEvent.placeCapacity,
          jeunePublic: declaration.eventSerie.audience === 'YOUNG' || declaration.eventSerie.audience === 'SCHOOL',
          domaineRepresentationId: performanceTypeId,
          lieuId: undefined, // Not reusing the place, maybe they handle themselves in case of same inputs
          lieuChamps: {
            nom: flattenEvent.place.name,
            adresse: flattenEvent.place.address.street,
            codePostal: flattenEvent.place.address.postalCode,
            ville: flattenEvent.place.address.city,
            siret: undefined,
            typeLieu: JsonPlaceTypeSchema.enum.AUTRE, // Since not having this information we set "other" by default, hopping not to pollute their stats if any
            denominationUsuelle: undefined,
          },
          festivalChamps: undefined,
          spectacleChamps: {
            domaineSpectacleId: performanceTypeId,
            critere1: declaration.eventSerie.name,
            critere2: `${declaration.eventSerie.producerName} (SIREN ${formatMaskedValue(
              officialIdMask,
              declaration.eventSerie.producerOfficialId
            )})`, // They except a field "Conception" but without this data on our side, we at least provide the producer info
            critere3: undefined,
            critere4: undefined,
          },
          statutDeclaration: 'ENREGISTRE', // TODO: should it be set to "CLOTURE" directly?
        },
      });

      if (createDeclarationResult.error) {
        // Perform specific handling depending on the error
        const errorResponse = JsonErrorResponseSchema.safeParse(createDeclarationResult.error);

        if (errorResponse.success) {
          // Since it seems there is no unique identifier for each error, we look at the message
          if (errorResponse.data.title.includes('déclaration existe déjà dans la base de données SIBIL avec les mêmes données saisies')) {
            // Note: for this case if the "idExtBilletterie" was the same it would just update the existing one
            // we notice here that's true if having same start date and same event serie spectacle ("critere1")... which has normally no reason to happen
            throw new Error(`inside the sibil system a different event (different "idExtBilletterie") is having the same start date`);
          }
        }

        throw createDeclarationResult.error;
      }

      const createDeclarationData = JsonCreateDeclarationResponseSchema.parse(createDeclarationResult.data);
    }
  }

  protected async retrievePerformanceTypesMapping(): Promise<{ [K in PerformanceTypeSchemaType]: number }> {
    assert(this.accessToken);

    // SIBIL list of performance types is dynamic and manageable by their admins, they do not use
    // a technical code so we have to map them based on patterns in their textual displayed values
    // For those reasons we are unlikely to hardcode them with their incremental IDs because we are
    // dependent of this, and among their environments the verbiage may be different

    // We use a mutex since those values are kind of constant over restarts, so no need to do this query each time
    const mutexRelease = await SibilClient.performanceTypesMutex.acquire();

    try {
      if (SibilClient.performanceTypes === null) {
        const performanceTypesResult = await getAllDomaineRepresentationsUsingGet1({
          client: this.client,
          query: {
            sansPagination: true,
          },
        });

        if (performanceTypesResult.error) {
          throw performanceTypesResult.error;
        }

        const performanceTypesData = JsonPerformanceTypesResponseSchema.parse(performanceTypesResult.data);
        const cleanRemotePerformancesTypes = performanceTypesData
          .map((performanceTypeData) => {
            return {
              id: performanceTypeData.id,
              label: performanceTypeData.libelle,
              enabled: performanceTypeData.actif,
            };
          })
          .filter((performanceType) => performanceType.enabled); // Only keep enabled ones

        const mapping: { [K in PerformanceTypeSchemaType]: number } = {
          OUTDOOR_PERFORMANCE: -1,
          CABARET_AND_MUSIC_HALL: -1,
          CIRCUS_AND_MAGIC: -1,
          MUSICAL_THEATRE: -1,
          DANCE: -1,
          COMEDY_AND_STAND_UP: -1,
          PUPPETRY: -1,
          CLASSICAL_AND_OPERA_AND_CONTEMPORARY_MUSIC: -1,
          POPULAR_AND_JAZZ_MUSIC: -1,
          WORLD_AND_TRADITIONAL_MUSIC_AND_DANCE: -1,
          HISTORICAL_REENACTMENTS_AND_HERITAGE_SOUND_AND_LIGHT_SHOWS: -1,
          LIVE_PERFORMANCE_WITHOUT_DOMINANT_DISCIPLINE: -1,
          ICE_SHOWS_AND_THEME_PARKS_AND_RELATED_PERFORMANCES: -1,
          THEATRE_AND_STORYTELLING_AND_MIME: -1,
        };

        const patternsPyInternalPerformanceTypes: { [K in PerformanceTypeSchemaType]: RegExp } = {
          OUTDOOR_PERFORMANCE: /arts de la rue$/i,
          CABARET_AND_MUSIC_HALL: /(cabaret|music-hall)/i,
          CIRCUS_AND_MAGIC: /cirque/i, // 2 exist for circus on SIBIL, traditional and creative ones... we let their results order to choose :)
          MUSICAL_THEATRE: /théâtre musical/i,
          DANCE: /danse de création/i, // SIBIL has 6 different types for dance... choosing the creative one to "englob others"
          COMEDY_AND_STAND_UP: /humour/i,
          PUPPETRY: /marionnettes/i,
          CLASSICAL_AND_OPERA_AND_CONTEMPORARY_MUSIC: /musique classique/i, // Could end into the contemporary type too
          POPULAR_AND_JAZZ_MUSIC: /genres assimilés/i, // Same here, multiple types matching, took the larger one
          WORLD_AND_TRADITIONAL_MUSIC_AND_DANCE: /musiques du monde/i, // There is another type for dance, but admitting here with dance there is almost always music too
          HISTORICAL_REENACTMENTS_AND_HERITAGE_SOUND_AND_LIGHT_SHOWS: /autre/i,
          LIVE_PERFORMANCE_WITHOUT_DOMINANT_DISCIPLINE: /autre/i,
          ICE_SHOWS_AND_THEME_PARKS_AND_RELATED_PERFORMANCES: /autre/i,
          THEATRE_AND_STORYTELLING_AND_MIME: /mime/i,
        };

        // From here we need to find for each internal performance type the sibil type that would match the most
        for (const internalPerformanceType of PerformanceTypeSchema.options) {
          const patternToSearch = patternsPyInternalPerformanceTypes[internalPerformanceType];

          const matchingRemotePerformanceTypeData = cleanRemotePerformancesTypes.find((remotePerformanceType) => {
            return patternToSearch.test(remotePerformanceType.label);
          });

          if (!matchingRemotePerformanceTypeData) {
            throw new Error(`no match for internal performance type "${internalPerformanceType}", search patterns must probably be adjusted`);
          }

          mapping[internalPerformanceType] = matchingRemotePerformanceTypeData.id;
        }

        SibilClient.performanceTypes = mapping;
      }

      return SibilClient.performanceTypes;
    } finally {
      mutexRelease();
    }
  }
}

export class MockSibilClient implements SibilClientInterface {
  public async login(): Promise<void> {}
  public async logout(): Promise<void> {}
  public async test(): Promise<void> {}

  public async declare(declaration: SibilDeclarationSchemaType): Promise<void> {
    // Simulate loading
    await sleep(1000);
  }
}
