import crypto from 'crypto';
import { format } from 'date-fns';
import { default as libphonenumber } from 'google-libphonenumber';

import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { useServerTranslation } from '@ad/src/i18n';
import { SacdAccountingCategorySchema, SacdDeclarationSchemaType, SacdProductionTypeSchema } from '@ad/src/models/entities/declaration/sacd';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonHelloWorldResponseSchema, JsonLoginResponseSchema } from '@ad/src/models/entities/sacd';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { convertInputModelToGooglePhoneNumber } from '@ad/src/utils/phone';

const phoneNumberUtil = libphonenumber.PhoneNumberUtil.getInstance();

export class SacdClient {
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
      const error = await response.json();

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

    const response = await fetch(`${this.baseUrl}/ticketing/logout?${queryParams.toString}`, {});

    if (!response.ok) {
      const error = await response.json();

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
      const error = await response.json();

      throw error;
    }

    const responseJson = await response.json();
    const responseObject = JsonHelloWorldResponseSchema.parse(responseJson);
  }

  protected formatString(value: string) {
    return value.slice(0, 128); // 128 chars max according to their documentation
  }

  protected formatDate(date: Date) {
    return format(date, 'yyyy/MM/dd');
  }

  protected formatTime(date: Date) {
    return format(date, 'HH:mm');
  }

  public async declare(
    declarantId: string,
    eventSerie: EventSerieSchemaType,
    wrappers: EventWrapperSchemaType[],
    declaration: SacdDeclarationSchemaType
  ) {
    assert(this.authToken);
    assert(wrappers.length > 0);

    const { t } = useServerTranslation('common');

    const queryParams = new URLSearchParams({
      key: this.consumerKey,
      token: this.getAccessToken(),
    });

    const bodyParams = new URLSearchParams(this.commonBodyParams);
    bodyParams.append('parameters[dec_ref]', declarantId);
    bodyParams.append('parameters[dec_systeme]', 'ASSISTANT_DECLARATION');
    bodyParams.append('parameters[dec_date]', this.formatDate(new Date()));
    bodyParams.append('parameters[dec_nb]', wrappers.length.toString());

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

      bodyParams.append('parameters[rep_ref_dec]', wrapper.event.id);
      bodyParams.append('parameters[rep_devise]', 'EUR'); // When synchronizing events series we refuse other currency so it's safe to be hardcoded for now
      bodyParams.append('parameters[rep_statut]', 'DEF');
      bodyParams.append('parameters[rep_version]', '1');
      bodyParams.append('parameters[rep_titre]', this.formatString(eventSerie.name));
      bodyParams.append('parameters[rep_date_debut]', this.formatDate(wrapper.event.startAt));
      bodyParams.append('parameters[rep_date_fin]', this.formatDate(wrapper.event.endAt));
      bodyParams.append('parameters[rep_nb]', '1');
      bodyParams.append('parameters[rep_horaire]', this.formatTime(wrapper.event.startAt));

      bodyParams.append(
        'parameters[rep_mt_billets]',
        getExcludingTaxesAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate).toString()
      );
      bodyParams.append('parameters[rep_tx_tva_billets]', (100 * eventSerie.taxRate).toString()); // Providing 5.5% as 5.5 instead of 0.055
      bodyParams.append(
        'parameters[rep_mt_tva_billets]',
        getTaxAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate).toString()
      );
      bodyParams.append('parameters[rep_nb_billets_pay]', paidTickets.toString());
      bodyParams.append('parameters[rep_nb_billets_exo]', freeTickets.toString());

      if (!eventSerieSpecificsFilled) {
        eventSerieSpecificsFilled = true;

        const saleOfRights = declaration.accountingEntries.find(
          (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.SALE_OF_RIGHTS
        );
        const saleOfRightsTaxRate = saleOfRights?.taxRate ?? 0;

        bodyParams.append(
          'parameters[rep_mt_cession]',
          saleOfRights ? getExcludingTaxesAmountFromIncludingTaxesAmount(saleOfRights.includingTaxesAmount, saleOfRightsTaxRate).toString() : '0'
        );
        bodyParams.append('parameters[rep_tx_tva_cession]', (100 * saleOfRightsTaxRate).toString()); // Providing 5.5% as 5.5 instead of 0.055
        bodyParams.append(
          'parameters[rep_mt_tva_cession]',
          saleOfRights ? getTaxAmountFromIncludingTaxesAmount(saleOfRights.includingTaxesAmount, saleOfRightsTaxRate).toString() : '0'
        );

        const introductionFees = declaration.accountingEntries.find(
          (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.INTRODUCTION_FEES
        );
        const introductionFeesTaxRate = introductionFees?.taxRate ?? 0;

        bodyParams.append(
          'parameters[rep_mt_frais]',
          introductionFees
            ? getExcludingTaxesAmountFromIncludingTaxesAmount(introductionFees.includingTaxesAmount, introductionFeesTaxRate).toString()
            : '0'
        );

        const coproductionContribution = declaration.accountingEntries.find(
          (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.COPRODUCTION_CONTRIBUTION
        );
        const coproductionContributionTaxRate = coproductionContribution?.taxRate ?? 0;

        bodyParams.append(
          'parameters[rep_mt_apports_coprod]',
          coproductionContribution
            ? getExcludingTaxesAmountFromIncludingTaxesAmount(
                coproductionContribution.includingTaxesAmount,
                coproductionContributionTaxRate
              ).toString()
            : '0'
        );

        const revenueGuarantee = declaration.accountingEntries.find(
          (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.REVENUE_GUARANTEE
        );
        const revenueGuaranteeTaxRate = revenueGuarantee?.taxRate ?? 0;

        bodyParams.append(
          'parameters[rep_mt_garantie_rec]',
          revenueGuarantee
            ? getExcludingTaxesAmountFromIncludingTaxesAmount(revenueGuarantee.includingTaxesAmount, revenueGuaranteeTaxRate).toString()
            : '0'
        );

        // // The budget is not something we are collecting from declarants
        // bodyParams.append(
        //   'parameters[rep_mt_depenses]',
        //   'TODO'
        // );

        const other = declaration.accountingEntries.find(
          (accountingEntry) => accountingEntry.category === SacdAccountingCategorySchema.Values.INTRODUCTION_FEES
        );
        const otherTaxRate = other?.taxRate ?? 0;

        bodyParams.append(
          'parameters[rep_mt_autres]',
          other ? getExcludingTaxesAmountFromIncludingTaxesAmount(other.includingTaxesAmount, otherTaxRate).toString() : '0'
        );
      }

      bodyParams.append('parameters[expl_nat]', declaration.productionType === SacdProductionTypeSchema.Values.AMATEUR ? 'AMA' : 'PRO');

      // bodyParams.append('parameters[expl_type_ref]', 'TODOOOOOOOO');
      // bodyParams.append('parameters[expl_ref]', 'TODOOOOOOOO');

      // TODO: SACD confirmed it must be per event whereas we did the audience global to the event serie, it should be changed
      // Note: they have not defined values so giving them french translations we have
      const repPublicTranslation = t(`model.sacdDeclaration.audience.enum.${declaration.audience}`);

      bodyParams.append('parameters[rep_public]', this.formatString(repPublicTranslation));

      bodyParams.append('parameters[salle_nom]', this.formatString(declaration.placeName));
      bodyParams.append('parameters[salle_jauge]', declaration.placeCapacity.toString());

      // TODO: should this be for the event or for the event serie?
      bodyParams.append('parameters[salle_prix_moyen]', declaration.averageTicketPrice.toString());

      bodyParams.append('parameters[diff_nom]', this.formatString(declaration.organizer.name));
      // bodyParams.append('parameters[diff_type_ref]', 'TODOOOOOOOO');
      // bodyParams.append('parameters[diff_ref]', 'TODOOOOOOOO');
      bodyParams.append('parameters[diff_adresse_1]', this.formatString(declaration.organizer.headquartersAddress.street));
      bodyParams.append('parameters[diff_code_postal]', this.formatString(declaration.organizer.headquartersAddress.postalCode));
      bodyParams.append('parameters[diff_ville]', this.formatString(declaration.organizer.headquartersAddress.city));
      bodyParams.append('parameters[diff_pays]', this.formatString(declaration.organizer.headquartersAddress.countryCode)); // Not translating the country for now
      bodyParams.append(
        'parameters[diff_tel]',
        this.formatString(
          phoneNumberUtil.format(convertInputModelToGooglePhoneNumber(declaration.organizer.phone), libphonenumber.PhoneNumberFormat.NATIONAL)
        )
      );
      bodyParams.append('parameters[diff_mel]', this.formatString(declaration.organizer.email));
      bodyParams.append('parameters[diff_tva]', this.formatString(declaration.organizer.europeanVatId));

      // should tva be 0.055 or 5.5 ?
      // should globlal info be on each rep? seems like duplicates
      // clarifier "représentations du groupe" c'est le groupe de déclarations donc ? ...

      // TODO:
      // TODO:
      // TODO: is it PARAMETERS OR XML to transfer, not clear!
      // TODO: a priori XML ...
      // TODO:

      const response = await fetch(`${this.baseUrl}/ticketing/broker/xxxxxxx?${queryParams.toString}`, {
        body: bodyParams.toString(),
      });

      if (!response.ok) {
        const error = await response.json();

        throw error;
      }
    }
  }
}
