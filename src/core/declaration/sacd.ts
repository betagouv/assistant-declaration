import crypto from 'crypto';
import { format } from 'date-fns';

import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { JsonHelloWorldResponseSchema, JsonLoginResponseSchema } from '@ad/src/models/entities/sacd';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

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

  protected formatDate(date: Date) {
    return format(date, 'yyyy/MM/dd');
  }

  protected formatTime(date: Date) {
    return format(date, 'HH:mm');
  }

  public async declare(declarantId: string, eventSerie: EventSerieSchemaType, wrappers: EventWrapperSchemaType[]) {
    assert(this.authToken);
    assert(wrappers.length > 0);

    const queryParams = new URLSearchParams({
      key: this.consumerKey,
      token: this.getAccessToken(),
    });

    // TODO:
    // TODO:
    // TODO: keep in memory success calls to not retry those if there are an error
    // TODO:
    // TODO:

    // TODO: truncate strings 128chars

    const sortedWrappers = wrappers.sort((a, b) => a.event.startAt.getTime() - b.event.startAt.getTime());

    // Since we cannot declare all events of an event serie at once, we have loop over each event and declare it one by one
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

      const bodyParams = new URLSearchParams(this.commonBodyParams);
      bodyParams.append('parameters[dec_ref]', declarantId);
      bodyParams.append('parameters[dec_systeme]', 'ASSISTANT_DECLARATION');
      bodyParams.append('parameters[dec_date]', this.formatDate(new Date()));
      bodyParams.append('parameters[dec_nb]', '1');
      bodyParams.append('parameters[rep_ref_dec]', wrapper.event.id);
      bodyParams.append('parameters[rep_devise]', 'EUR');
      bodyParams.append('parameters[rep_statut]', 'DEF');
      bodyParams.append('parameters[rep_version]', '1');
      bodyParams.append('parameters[rep_titre]', eventSerie.name);
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

      bodyParams.append('parameters[rep_mt_cession]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_tx_tva_cession]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_mt_tva_cession]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_mt_frais]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_mt_apports_coprod]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_mt_garantie_rec]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_mt_depenses]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_mt_autres]', 'TODOOOOOOOO');
      bodyParams.append('parameters[expl_nat]', true ? 'AMA' : 'PRO');
      bodyParams.append('parameters[expl_type_ref]', 'TODOOOOOOOO');
      // bodyParams.append('parameters[expl_ref]', 'TODOOOOOOOO');
      bodyParams.append('parameters[rep_public]', 'TODOOOOOOOO');
      bodyParams.append('parameters[salle_jauge]', 'TODOOOOOOOO');
      bodyParams.append('parameters[salle_prix_moyen]', 'TODOOOOOOOO');
      bodyParams.append('parameters[diff_nom]', 'TODOOOOOOOO');
      bodyParams.append('parameters[diff_type_ref]', 'TODOOOOOOOO');

      // TODO: set diffuseur or not?... since they have it

      bodyParams.append('parameters[salle_nom]', 'TODOOOOOOOO');
      bodyParams.append('parameters[diff_ville]', 'TODOOOOOOOO');
      bodyParams.append('parameters[diff_pays]', 'TODOOOOOOOO');

      // should tva be 0.055 or 5.5 ?

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
