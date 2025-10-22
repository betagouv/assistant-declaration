import crypto from 'crypto';
import { formatInTimeZone } from 'date-fns-tz';
import { create } from 'xmlbuilder2';

import { getTaxAmountFromIncludingAndExcludingTaxesAmounts } from '@ad/src/core/declaration';
import { getFlattenEventsForSacdDeclaration } from '@ad/src/core/declaration/format';
import { getServerTranslation } from '@ad/src/i18n';
import { SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { sacdDeclarationIncorrectDeclarantError, sacdDeclarationUnsuccessfulError } from '@ad/src/models/entities/errors';
import {
  JsonDeclarationParameterSchemaType,
  JsonDeclareResponseSchema,
  JsonErrorResponseSchema,
  JsonHelloWorldResponseSchema,
  JsonLoginResponseSchema,
} from '@ad/src/models/entities/sacd';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { sleep } from '@ad/src/utils/sleep';

const sacdApiTimezone = 'Europe/Paris';

export interface SacdClientInterface {
  login(): Promise<void>;
  logout(): Promise<void>;
  test(): Promise<void>;
  declare(declaration: SacdDeclarationSchemaType): Promise<void>;
}

export function getSacdClient(userId: string): SacdClientInterface {
  if (
    process.env.APP_MODE !== 'prod' &&
    (!process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS || !process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS.split(',').includes(userId))
  ) {
    return new MockSacdClient();
  } else {
    return new SacdClient(
      process.env.SACD_API_CONSUMER_KEY || '',
      process.env.SACD_API_SECRET_KEY || '',
      process.env.SACD_API_PROVIDER_NAME || '',
      process.env.SACD_API_PROVIDER_REFFILE || '',
      process.env.SACD_API_PROVIDER_PASSWORD || ''
    );
  }
}

export class SacdClient implements SacdClientInterface {
  protected readonly baseUrl: string = process.env.SACD_API_BASE_URL || 'https://nowhere';
  protected commonBodyParams: URLSearchParams;
  protected commonPostHeaders: HeadersInit = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded',
    // Random but asked:
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  });
  protected authToken: string | null = null;
  protected md5Password: string;

  constructor(
    protected readonly consumerKey: string,
    protected readonly secretKey: string,
    protected readonly providerName: string,
    protected readonly providerReffile: string,
    protected readonly providerPassword: string
  ) {
    this.commonBodyParams = new URLSearchParams();
    this.commonBodyParams.append('parameters[Application]', this.providerName);
    this.commonBodyParams.append('parameters[LoginRefFile]', this.providerReffile);
    this.commonBodyParams.append('parameters[Language]', 'FR');

    this.md5Password = crypto.createHash('md5').update(this.providerPassword).digest('hex');
  }

  protected getAccessToken(): string {
    return crypto.createHash('md5').update(`${this.secretKey}${this.authToken}`).digest('hex');
  }

  public loggedIn(): boolean {
    return this.authToken !== null;
  }

  public async login() {
    const bodyParams = new URLSearchParams();
    bodyParams.append('login[login]', this.providerReffile);
    bodyParams.append('login[password]', this.md5Password);
    bodyParams.append('login[consumer_key]', this.consumerKey);

    const response = await fetch(`${this.baseUrl}/ticketing/auto-access.json`, {
      method: 'POST',
      headers: this.commonPostHeaders,
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const error = await response.text();

      throw error;
    }

    const responseJson = await response.json();
    const responseObject = JsonLoginResponseSchema.parse(responseJson);

    this.authToken = responseObject.AuthToken;
  }

  public async logout() {
    if (!this.authToken) {
      return;
    }

    const queryParams = new URLSearchParams({
      key: this.consumerKey,
      token: this.getAccessToken(),
    });

    const response = await fetch(`${this.baseUrl}/ticketing/logout?${queryParams.toString()}`, {});

    if (!response.ok) {
      const error = await response.text();

      throw error;
    }

    this.authToken = null;
  }

  public async test() {
    assert(this.authToken);

    const queryParams = new URLSearchParams({
      key: this.consumerKey,
      token: this.getAccessToken(),
    });

    const bodyParams = new URLSearchParams(this.commonBodyParams);

    const response = await fetch(`${this.baseUrl}/ticketing/broker/HelloWorldWS?${queryParams.toString()}`, {
      method: 'POST',
      headers: this.commonPostHeaders,
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const error = await response.text();

      throw error;
    }

    const responseJson = await response.json();
    const responseObject = JsonHelloWorldResponseSchema.parse(responseJson);
  }

  public async declare(declaration: SacdDeclarationSchemaType) {
    assert(this.authToken);
    assert(declaration.events.length > 0);

    const queryParams = new URLSearchParams({
      key: this.consumerKey,
      token: this.getAccessToken(),
    });

    const declarationParameter = prepareDeclarationParameter(declaration);

    const bodyParams = new URLSearchParams(this.commonBodyParams);
    bodyParams.append('parameters[Declaration]', declarationParameter);

    const response = await fetch(`${this.baseUrl}/ticketing/broker/ExploitFileTransmitETicketingDeclarationWS?${queryParams.toString()}`, {
      method: 'POST',
      headers: this.commonPostHeaders,
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const error = await response.text();

      throw error;
    }

    const responseText = await response.text();

    // For some reasons they may return JSON error despite a success status code, so instead of
    // assuming it's directly XML we simply check the content
    if (responseText.trim().startsWith('{')) {
      const responseJson = JSON.parse(responseText);
      const errorObject = JsonErrorResponseSchema.parse(responseJson);

      if (errorObject.Error.Code === 'ERR_WS_DEC_REF') {
        throw sacdDeclarationIncorrectDeclarantError;
      } else {
        // By default consider the raw error
        throw new Error(JSON.stringify(errorObject));
      }
    }

    // The content should be XML otherwise
    const responseJson = create(responseText).end({ format: 'object' });
    const responseObject = JsonDeclareResponseSchema.parse(responseJson);

    // SACD may consider the declaration as partially successful so we have to check the status of each event
    // to be sure... Since we have no way for the user to correct the errors, we just notify him he has to
    // reach the SACD operator to investigate
    const warnings: string[] = [];
    const errors: string[] = [];

    const representations = Array.isArray(responseObject.Declaration.Representations.Representation)
      ? responseObject.Declaration.Representations.Representation
      : [responseObject.Declaration.Representations.Representation];

    for (const representation of representations) {
      if (representation.statut === 'KO') {
        errors.push(representation.message || 'unknown');
      } else if (representation.statut === 'WARNING') {
        warnings.push(representation.message || 'unknown');
      }
    }

    // TODO: errors and warnings could be saved into database so we know about things to investigate
    if (errors.length > 0) {
      throw sacdDeclarationUnsuccessfulError;
    }
  }
}

function formatString(value: string) {
  return value.slice(0, 128); // 128 chars max according to their documentation
}

function formatAmountNumber(value: number) {
  return Math.round(value * 100) / 100; // Avoid having more than 2 decimals
}

function formatDate(date: Date) {
  // Use France timezone since they seem to expect local time
  return formatInTimeZone(date, sacdApiTimezone, 'yyyy/MM/dd');
}

function formatTime(date: Date) {
  // Use France timezone since they seem to expect local time
  return formatInTimeZone(date, sacdApiTimezone, 'HH:mm');
}

export function prepareDeclarationParameter(declaration: SacdDeclarationSchemaType, declarationAt?: Date): string {
  const { t } = getServerTranslation('common');

  const declarationParameter: JsonDeclarationParameterSchemaType = {
    Declaration: {
      Header: {
        dec_ref: declaration.organization.sacdId,
        dec_systeme: 'ASSISTANT_DECLARATION',
        dec_date: formatDate(declarationAt ?? new Date()),
        dec_nb: declaration.events.length,
      },
      Representations: {
        Representation: [],
      },
    },
  };

  const flattenEvents = getFlattenEventsForSacdDeclaration(declaration);

  // Order events for the ease when debugging
  const ascendingFlattenEvents = flattenEvents.sort((a, b) => +a.startAt - +b.startAt);

  // Expenses are scoped to the event serie (not an event), since SACD set those fields on the event layer
  // we chose to only fill those fields for the first event
  let eventSerieSpecificsFilled = false;

  for (const flattenEvent of ascendingFlattenEvents) {
    const declarationParameterRepresentation: JsonDeclarationParameterSchemaType['Declaration']['Representations']['Representation'][0] = {
      rep_ref_dec: formatString(`${declaration.eventSerie.id}_${flattenEvent.id}`),
      rep_devise: 'EUR', // When synchronizing events series we refuse other currency so it's safe to be hardcoded for now
      rep_statut: 'DEF',
      rep_version: '1',
      rep_titre: formatString(declaration.eventSerie.name),
      rep_date_debut: formatDate(flattenEvent.startAt),
      rep_date_fin: formatDate(flattenEvent.endAt ?? flattenEvent.startAt), // SACD requires the end date (since it's not a datetime, we use as fallback the beginning date that should match the end for most of events)
      rep_nb: 1, // Since each event has a separate entity
      rep_horaire: formatTime(flattenEvent.startAt),
      Billetterie: {
        rep_mt_billets: formatAmountNumber(flattenEvent.ticketingRevenueExcludingTaxes),
        rep_mt_tva_billets: formatAmountNumber(
          getTaxAmountFromIncludingAndExcludingTaxesAmounts(flattenEvent.ticketingRevenueIncludingTaxes, flattenEvent.ticketingRevenueExcludingTaxes)
        ),
        rep_nb_billets_pay: flattenEvent.paidTickets,
        rep_nb_billets_exo: flattenEvent.freeTickets,
        // ...(flattenEvent.ticketingRevenueTaxRate !== null
        //   ? {
        //       rep_tx_tva_billets: 100 * flattenEvent.ticketingRevenueTaxRate, // Providing 5.5% as 5.5 instead of 0.055
        //     }
        //   : {}),
      },
      Exploitation: {
        // expl_type_ref: 'TODO',
        // expl_ref: formatString('TODO'),
      },
      Salle: {
        salle_nom: formatString(flattenEvent.place.name),
        salle_jauge: flattenEvent.placeCapacity,
        // TODO: should this be for the event or for the event serie?
        // Also, they want the average of all public displayed tarifs, which is tricky since we don't manage this data... so skipping it for now
        // salle_prix_moyen: totalIncludingTaxesAmount / (freeTickets + paidTickets),
      },
      Diffuseur: {
        diff_nom: formatString(declaration.organization.name),
        diff_type_ref: 'SIREN',
        diff_ref: formatString(declaration.organization.officialId),
        diff_adresse_1: formatString(declaration.eventSerie.place.address.street),
        diff_code_postal: formatString(declaration.eventSerie.place.address.postalCode),
        diff_ville: formatString(declaration.eventSerie.place.address.city),
        diff_pays: formatString(declaration.eventSerie.place.address.countryCode), // Not translating the country for now
      },
      Producteur: {
        prod_nom: formatString(declaration.eventSerie.producerName),
        prod_type_ref: 'SIREN',
        prod_ref: formatString(declaration.eventSerie.producerOfficialId),
      },
    };

    if (!eventSerieSpecificsFilled) {
      eventSerieSpecificsFilled = true;

      // TODO: is cession all expenses in our... probably not, waiting for mockups
      declarationParameterRepresentation.Exploitation.rep_mt_depenses = formatAmountNumber(
        declaration.eventSerie.expensesExcludingTaxes - declaration.eventSerie.circusSpecificExpensesExcludingTaxes
      );
      declarationParameterRepresentation.Exploitation.rep_mt_frais = formatAmountNumber(
        declaration.eventSerie.introductionFeesExpensesExcludingTaxes
      );
    }

    declarationParameter.Declaration.Representations.Representation.push(declarationParameterRepresentation);
  }

  const xml: string = create(
    {
      encoding: 'utf-8',
      version: '1.0',
    },
    declarationParameter
  ).end({
    prettyPrint: true,
  });

  return xml;
}

export class MockSacdClient implements SacdClientInterface {
  public async login(): Promise<void> {}

  public async logout(): Promise<void> {}
  public async test(): Promise<void> {}

  public async declare(declaration: SacdDeclarationSchemaType): Promise<void> {
    // Simulate loading
    await sleep(1000);
  }
}
