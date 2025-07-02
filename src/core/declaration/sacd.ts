import crypto from 'crypto';
import { format } from 'date-fns';
import { default as libphonenumber } from 'google-libphonenumber';
import { create } from 'xmlbuilder2';

import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { getServerTranslation } from '@ad/src/i18n';
import { SacdAccountingCategorySchema, SacdDeclarationSchemaType, SacdProductionTypeSchema } from '@ad/src/models/entities/declaration/sacd';
import { sacdDeclarationIncorrectDeclarantError, sacdDeclarationUnsuccessfulError } from '@ad/src/models/entities/errors';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import {
  JsonDeclarationParameterSchemaType,
  JsonDeclareResponseSchema,
  JsonErrorResponseSchema,
  JsonHelloWorldResponseSchema,
  JsonLoginResponseSchema,
} from '@ad/src/models/entities/sacd';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { convertInputModelToGooglePhoneNumber } from '@ad/src/utils/phone';
import { sleep } from '@ad/src/utils/sleep';

const phoneNumberUtil = libphonenumber.PhoneNumberUtil.getInstance();

export interface SacdClientInterface {
  login(): Promise<void>;
  logout(): Promise<void>;
  test(): Promise<void>;
  declare(
    declarantId: string,
    eventSerie: EventSerieSchemaType,
    wrappers: EventWrapperSchemaType[],
    declaration: SacdDeclarationSchemaType
  ): Promise<void>;
}

export function getSacdClient(userId: string): SacdClientInterface {
  if (
    process.env.APP_MODE !== 'prod' &&
    (!process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS || !process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS.split(',').includes(userId))
  ) {
    return new MockSacdClient();
  } else {
    return new SacdClient(
      process.env.TEST_SACD_API_CONSUMER_KEY || '',
      process.env.TEST_SACD_API_SECRET_KEY || '',
      process.env.TEST_SACD_API_PROVIDER_NAME || '',
      process.env.TEST_SACD_API_PROVIDER_REFFILE || '',
      process.env.TEST_SACD_API_PROVIDER_PASSWORD || ''
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

  public async declare(
    declarantId: string,
    eventSerie: EventSerieSchemaType,
    wrappers: EventWrapperSchemaType[],
    declaration: SacdDeclarationSchemaType
  ) {
    assert(this.authToken);
    assert(wrappers.length > 0);

    const queryParams = new URLSearchParams({
      key: this.consumerKey,
      token: this.getAccessToken(),
    });

    const declarationParameter = prepareDeclarationParameter(declarantId, eventSerie, wrappers, declaration);

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

    for (const representation of responseObject.Declaration.Representations.Representation) {
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
  return format(date, 'yyyy/MM/dd');
}

function formatTime(date: Date) {
  return format(date, 'HH:mm');
}

export function prepareDeclarationParameter(
  declarantId: string,
  eventSerie: EventSerieSchemaType,
  wrappers: EventWrapperSchemaType[],
  declaration: SacdDeclarationSchemaType,
  declarationAt?: Date
): string {
  const { t } = getServerTranslation('common');

  const declarationParameter: JsonDeclarationParameterSchemaType = {
    Declaration: {
      Header: {
        dec_ref: declarantId,
        dec_systeme: 'ASSISTANT_DECLARATION',
        dec_date: formatDate(declarationAt ?? new Date()),
        dec_nb: wrappers.length,
      },
      Representations: {
        Representation: [],
      },
    },
  };

  // Order events for the ease when debugging
  const sortedWrappers = wrappers.sort((a, b) => a.event.startAt.getTime() - b.event.startAt.getTime());

  // After contacting the SACD support they said amounts scoped to the event serie should be filled only once
  // on the first event of the serie (maybe they have case of people splitting them per event but we don't)
  let eventSerieSpecificsFilled = false;

  for (const wrapper of sortedWrappers) {
    let totalIncludingTaxesAmount: number = 0;
    let paidTickets: number = 0;
    let freeTickets: number = 0;

    for (const eventSale of wrapper.sales) {
      const total = eventSale.eventCategoryTickets.totalOverride ?? eventSale.eventCategoryTickets.total;
      const price = eventSale.eventCategoryTickets.priceOverride ?? eventSale.ticketCategory.price;

      if (price === 0) {
        freeTickets += total;
      } else {
        paidTickets += total;
      }

      totalIncludingTaxesAmount += total * price;
    }

    // TODO: SACD confirmed it must be per event whereas we did the audience global to the event serie, it should be changed
    // Note: they have not defined values so giving them french translations we have
    const repPublicTranslation = t(`model.sacdDeclaration.audience.enum.${declaration.audience}`);

    const declarationParameterRepresentation: JsonDeclarationParameterSchemaType['Declaration']['Representations']['Representation'][0] = {
      rep_ref_dec: formatString(`${eventSerie.id}_${wrapper.event.id}`),
      rep_devise: 'EUR', // When synchronizing events series we refuse other currency so it's safe to be hardcoded for now
      rep_statut: 'DEF',
      rep_version: '1',
      rep_titre: formatString(eventSerie.name),
      rep_date_debut: formatDate(wrapper.event.startAt),
      rep_date_fin: formatDate(wrapper.event.endAt),
      rep_nb: 1, // Since each event has a separate entity
      rep_horaire: formatTime(wrapper.event.startAt),
      Billetterie: {
        rep_mt_billets: formatAmountNumber(getExcludingTaxesAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate)),
        rep_tx_tva_billets: 100 * eventSerie.taxRate, // Providing 5.5% as 5.5 instead of 0.055
        rep_mt_tva_billets: formatAmountNumber(getTaxAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate)),
        rep_nb_billets_pay: paidTickets,
        rep_nb_billets_exo: freeTickets,
      },
      Exploitation: {
        expl_nat: declaration.productionType === SacdProductionTypeSchema.Values.AMATEUR ? 'AMA' : 'PRO',
        rep_public: formatString(repPublicTranslation),
        // expl_type_ref: 'TODO',
        // expl_ref: formatString('TODO'),
      },
      Salle: {
        salle_nom: formatString(declaration.placeName),
        salle_jauge: declaration.placeCapacity,
        // TODO: should this be for the event or for the event serie?
        // Also, they seem to want it to be the total of tarifs devided by the capacity... so skipping it for now
        // salle_prix_moyen: totalIncludingTaxesAmount / (freeTickets + paidTickets),
      },
      Diffuseur: {
        diff_nom: formatString(declaration.organizer.name),
        // diff_type_ref: 'TODO',
        // diff_ref: formatString('TODO'),
        diff_adresse_1: formatString(declaration.organizer.headquartersAddress.street),
        diff_code_postal: formatString(declaration.organizer.headquartersAddress.postalCode),
        diff_ville: formatString(declaration.organizer.headquartersAddress.city),
        diff_pays: formatString(declaration.organizer.headquartersAddress.countryCode), // Not translating the country for now
        diff_tel: formatString(
          phoneNumberUtil.format(convertInputModelToGooglePhoneNumber(declaration.organizer.phone), libphonenumber.PhoneNumberFormat.NATIONAL)
        ),
        diff_mel: formatString(declaration.organizer.email),
        diff_tva: formatString(declaration.organizer.europeanVatId),
      },
      Producteur: {
        prod_nom: formatString(declaration.producer.name),
        // prod_type_ref: 'TODO',
        // prod_ref: formatString('TODO'),
        prod_adresse_1: formatString(declaration.producer.headquartersAddress.street),
        prod_code_postal: formatString(declaration.producer.headquartersAddress.postalCode),
        prod_ville: formatString(declaration.producer.headquartersAddress.city),
        prod_pays: formatString(declaration.producer.headquartersAddress.countryCode), // Not translating the country for now
        prod_tel: formatString(
          phoneNumberUtil.format(convertInputModelToGooglePhoneNumber(declaration.producer.phone), libphonenumber.PhoneNumberFormat.NATIONAL)
        ),
        prod_mel: formatString(declaration.producer.email),
        prod_tva: formatString(declaration.producer.europeanVatId),
      },
    };

    if (!eventSerieSpecificsFilled) {
      eventSerieSpecificsFilled = true;

      const saleOfRights = declaration.accountingEntries.find(
        (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.SALE_OF_RIGHTS
      );
      const saleOfRightsTaxRate = saleOfRights?.taxRate ?? 0;

      declarationParameterRepresentation.Exploitation.rep_mt_cession = formatAmountNumber(
        saleOfRights ? getExcludingTaxesAmountFromIncludingTaxesAmount(saleOfRights.includingTaxesAmount, saleOfRightsTaxRate) : 0
      );
      declarationParameterRepresentation.Exploitation.rep_tx_tva_cession = 100 * saleOfRightsTaxRate; // Providing 5.5% as 5.5 instead of 0.055
      declarationParameterRepresentation.Exploitation.rep_mt_tva_cession = formatAmountNumber(
        saleOfRights ? getTaxAmountFromIncludingTaxesAmount(saleOfRights.includingTaxesAmount, saleOfRightsTaxRate) : 0
      );

      const introductionFees = declaration.accountingEntries.find(
        (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.INTRODUCTION_FEES
      );
      const introductionFeesTaxRate = introductionFees?.taxRate ?? 0;

      declarationParameterRepresentation.Exploitation.rep_mt_frais = formatAmountNumber(
        introductionFees ? getExcludingTaxesAmountFromIncludingTaxesAmount(introductionFees.includingTaxesAmount, introductionFeesTaxRate) : 0
      );

      const coproductionContribution = declaration.accountingEntries.find(
        (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.COPRODUCTION_CONTRIBUTION
      );
      const coproductionContributionTaxRate = coproductionContribution?.taxRate ?? 0;

      declarationParameterRepresentation.Exploitation.rep_mt_apports_coprod = formatAmountNumber(
        coproductionContribution
          ? getExcludingTaxesAmountFromIncludingTaxesAmount(coproductionContribution.includingTaxesAmount, coproductionContributionTaxRate)
          : 0
      );

      const revenueGuarantee = declaration.accountingEntries.find(
        (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.REVENUE_GUARANTEE
      );
      const revenueGuaranteeTaxRate = revenueGuarantee?.taxRate ?? 0;

      declarationParameterRepresentation.Exploitation.rep_mt_garantie_rec = formatAmountNumber(
        revenueGuarantee ? getExcludingTaxesAmountFromIncludingTaxesAmount(revenueGuarantee.includingTaxesAmount, revenueGuaranteeTaxRate) : 0
      );

      // // The budget is not something we are collecting from declarants
      // declarationParameterRepresentation.Exploitation.rep_mt_depenses = 'TODO';

      const other = declaration.accountingEntries.find((accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.OTHER);
      const otherTaxRate = other?.taxRate ?? 0;

      declarationParameterRepresentation.Exploitation.rep_mt_autres = formatAmountNumber(
        other ? getExcludingTaxesAmountFromIncludingTaxesAmount(other.includingTaxesAmount, otherTaxRate) : 0
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

  public async declare(
    declarantId: string,
    eventSerie: EventSerieSchemaType,
    wrappers: EventWrapperSchemaType[],
    declaration: SacdDeclarationSchemaType
  ): Promise<void> {
    // Simulate loading
    await sleep(1000);
  }
}
