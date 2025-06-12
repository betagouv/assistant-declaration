import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Datetime: { input: string; output: string; }
};

export type Address = {
  __typename?: 'Address';
  /** Address Country Code */
  countryCode: Maybe<Scalars['String']['output']>;
  /** Address Country */
  county: Maybe<Scalars['String']['output']>;
  /** Address First Name */
  firstName: Maybe<Scalars['String']['output']>;
  /** Address Last Name */
  lastName: Maybe<Scalars['String']['output']>;
  /** Address Line 1 */
  line1: Maybe<Scalars['String']['output']>;
  /** Address Line 2 */
  line2: Maybe<Scalars['String']['output']>;
  /** Address Post Code */
  postCode: Maybe<Scalars['String']['output']>;
  /** Address Town */
  town: Maybe<Scalars['String']['output']>;
};

export type Adjustment = {
  __typename?: 'Adjustment';
  feesChange: Maybe<Array<Maybe<TicketFee>>>;
  processedAt: Maybe<Scalars['Datetime']['output']>;
  reason: Maybe<Scalars['String']['output']>;
  ticket: Maybe<Ticket>;
};

export type Artist = {
  __typename?: 'Artist';
  /** Name */
  name: Maybe<Scalars['String']['output']>;
};

export type ClaimTicketsInput = {
  fanId?: InputMaybe<Scalars['ID']['input']>;
  fanSecureToken?: InputMaybe<Scalars['String']['input']>;
  ticketIds: Array<InputMaybe<Scalars['ID']['input']>>;
};

export type ClaimTicketsPayload = {
  __typename?: 'ClaimTicketsPayload';
  /** A list of failed validations. May be blank or null if mutation succeeded. */
  messages: Maybe<Array<Maybe<ValidationMessage>>>;
  /** The object created/updated/deleted by the mutation. May be null if mutation failed. */
  result: Maybe<Array<Maybe<Ticket>>>;
  /** Indicates if the mutation completed successfully or not.  */
  successful: Scalars['Boolean']['output'];
};

export type EqBooleanInput = {
  /** Equal to */
  eq?: InputMaybe<Scalars['Boolean']['input']>;
};

export type EqStringInput = {
  /** Equal to */
  eq?: InputMaybe<Scalars['String']['input']>;
};

export type Event = Node & {
  __typename?: 'Event';
  /** List of artists participating in the event */
  artists: Maybe<Array<Maybe<Artist>>>;
  /** Cost currency. See EventCostCurrency enum for the list of available values */
  currency: Maybe<EventCostCurrency>;
  /** Description */
  description: Maybe<Scalars['String']['output']>;
  /** End date and time */
  endDatetime: Maybe<Scalars['Datetime']['output']>;
  /** Event id. Field is available with restricted access */
  eventIdLive: Maybe<Scalars['String']['output']>;
  /** Paginated list of sold extras */
  extras: Maybe<ExtraConnection>;
  /** List of related genre types */
  genreTypes: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** List of related genres */
  genres: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Is the event hidden? */
  hidden: Maybe<Scalars['Boolean']['output']>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** List of images */
  images: Maybe<Array<Maybe<Image>>>;
  /** Name. Field is available with restricted access */
  name: Maybe<Scalars['String']['output']>;
  /** List of products available for purchasing */
  products: Maybe<Array<Maybe<Product>>>;
  /** List of promoters with access to event in MIO */
  promoters: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  socialLinks: Maybe<Array<Maybe<SocialLink>>>;
  /** Start date and time. Field is available with restricted access */
  startDatetime: Maybe<Scalars['Datetime']['output']>;
  /** State. See EventState enum for the list of available values */
  state: Maybe<EventState>;
  /** List of tickets types available for purchasing */
  ticketTypes: Maybe<Array<Maybe<TicketType>>>;
  /** Paginated list of sold tickets */
  tickets: Maybe<TicketConnection>;
  /** Total ticket allocation quantity */
  totalTicketAllocationQty: Maybe<Scalars['Int']['output']>;
  /** Last updated at date and time */
  updatedAt: Maybe<Scalars['Datetime']['output']>;
  /** Fan facing url for the event */
  url: Maybe<Scalars['String']['output']>;
  /** List of venues */
  venues: Maybe<Array<Maybe<Venue>>>;
};


export type EventExtrasArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ExtraWhereInput>;
};


export type EventTicketsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type EventConnection = {
  __typename?: 'EventConnection';
  edges: Maybe<Array<Maybe<EventEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export enum EventCostCurrency {
  Aed = 'AED',
  Afn = 'AFN',
  All = 'ALL',
  Amd = 'AMD',
  Aoa = 'AOA',
  Ars = 'ARS',
  Aud = 'AUD',
  Awg = 'AWG',
  Azn = 'AZN',
  Bam = 'BAM',
  Bbd = 'BBD',
  Bdt = 'BDT',
  Bgn = 'BGN',
  Bhd = 'BHD',
  Bif = 'BIF',
  Bmd = 'BMD',
  Bnd = 'BND',
  Bob = 'BOB',
  Brl = 'BRL',
  Bwp = 'BWP',
  Byr = 'BYR',
  Bzd = 'BZD',
  Cad = 'CAD',
  Cdf = 'CDF',
  Chf = 'CHF',
  Clp = 'CLP',
  Cny = 'CNY',
  Cop = 'COP',
  Crc = 'CRC',
  Cve = 'CVE',
  Czk = 'CZK',
  Djf = 'DJF',
  Dkk = 'DKK',
  Dop = 'DOP',
  Dzd = 'DZD',
  Egp = 'EGP',
  Ern = 'ERN',
  Etb = 'ETB',
  Eur = 'EUR',
  Gbp = 'GBP',
  Gel = 'GEL',
  Ghs = 'GHS',
  Gnf = 'GNF',
  Gtq = 'GTQ',
  Gyd = 'GYD',
  Hkd = 'HKD',
  Hnl = 'HNL',
  Hrk = 'HRK',
  Huf = 'HUF',
  Idr = 'IDR',
  Ils = 'ILS',
  Inr = 'INR',
  Iqd = 'IQD',
  Irr = 'IRR',
  Isk = 'ISK',
  Jmd = 'JMD',
  Jod = 'JOD',
  Jpy = 'JPY',
  Kes = 'KES',
  Khr = 'KHR',
  Kmf = 'KMF',
  Krw = 'KRW',
  Kwd = 'KWD',
  Kzt = 'KZT',
  Lbp = 'LBP',
  Lkr = 'LKR',
  Lrd = 'LRD',
  Ltl = 'LTL',
  Lvl = 'LVL',
  Lyd = 'LYD',
  Mad = 'MAD',
  Mdl = 'MDL',
  Mga = 'MGA',
  Mkd = 'MKD',
  Mmk = 'MMK',
  Mop = 'MOP',
  Mur = 'MUR',
  Mxn = 'MXN',
  Myr = 'MYR',
  Mzn = 'MZN',
  Nad = 'NAD',
  Ngn = 'NGN',
  Nio = 'NIO',
  Nok = 'NOK',
  Npr = 'NPR',
  Nzd = 'NZD',
  Omr = 'OMR',
  Pab = 'PAB',
  Pen = 'PEN',
  Php = 'PHP',
  Pkr = 'PKR',
  Pln = 'PLN',
  Pyg = 'PYG',
  Qar = 'QAR',
  Ron = 'RON',
  Rsd = 'RSD',
  Rub = 'RUB',
  Rwf = 'RWF',
  Sar = 'SAR',
  Sdg = 'SDG',
  Sek = 'SEK',
  Sgd = 'SGD',
  Sos = 'SOS',
  Std = 'STD',
  Syp = 'SYP',
  Thb = 'THB',
  Tnd = 'TND',
  Top = 'TOP',
  Try = 'TRY',
  Ttd = 'TTD',
  Twd = 'TWD',
  Tzs = 'TZS',
  Uah = 'UAH',
  Ugx = 'UGX',
  Usd = 'USD',
  Uyu = 'UYU',
  Uzs = 'UZS',
  Vef = 'VEF',
  Vnd = 'VND',
  Xaf = 'XAF',
  Xof = 'XOF',
  Yer = 'YER',
  Zar = 'ZAR',
  Zmk = 'ZMK'
}

export type EventEdge = {
  __typename?: 'EventEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<Event>;
};

export enum EventImageType {
  Brand = 'BRAND',
  Landscape = 'LANDSCAPE',
  Portrait = 'PORTRAIT',
  Square = 'SQUARE'
}

export enum EventState {
  Approved = 'APPROVED',
  Archived = 'ARCHIVED',
  Cancelled = 'CANCELLED',
  Declined = 'DECLINED',
  Draft = 'DRAFT',
  Review = 'REVIEW',
  Submitted = 'SUBMITTED'
}

export type EventWhereInput = {
  endDatetime?: InputMaybe<OperatorsDateInput>;
  genre?: InputMaybe<OperatorsIdInput>;
  id?: InputMaybe<OperatorsIdInput>;
  startDatetime?: InputMaybe<OperatorsDateInput>;
  state?: InputMaybe<OperatorsEventStateInput>;
  updatedAt?: InputMaybe<OperatorsDateInput>;
};

export type Extra = Node & {
  __typename?: 'Extra';
  /** QR code. Field is available with restricted access */
  code: Maybe<Scalars['String']['output']>;
  /** Partner commission in cents */
  commission: Maybe<Scalars['Int']['output']>;
  /** DICE commission in cents */
  diceCommission: Maybe<Scalars['Int']['output']>;
  /** Fees breakdown by category */
  fees: Maybe<Array<Maybe<TicketFee>>>;
  /** Price without commissions in cents */
  fullPrice: Maybe<Scalars['Int']['output']>;
  /** Flag that extra has separate barcode. Field is available with restricted access */
  hasSeparateAccessBarcode: Maybe<Scalars['Boolean']['output']>;
  /** Ticket holder. Field is available with restricted access */
  holder: Maybe<Fan>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Product. Field is available with restricted access */
  product: Maybe<Product>;
  /** Ticket which the extra is linked to. Field is available with restricted access */
  ticket: Maybe<Ticket>;
  /** Total price with commissions in cents. Field is available with restricted access */
  total: Maybe<Scalars['Int']['output']>;
  /** Variant. Field is available with restricted access */
  variant: Maybe<Variant>;
};

export type ExtraConnection = {
  __typename?: 'ExtraConnection';
  edges: Maybe<Array<Maybe<ExtraEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type ExtraEdge = {
  __typename?: 'ExtraEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<Extra>;
};

export type ExtraWhereInput = {
  eventId?: InputMaybe<OperatorsIdInput>;
  hasSeparateAccessBarcode?: InputMaybe<EqBooleanInput>;
  id?: InputMaybe<OperatorsIdInput>;
  productId?: InputMaybe<OperatorsIdInput>;
};

export type Fan = {
  __typename?: 'Fan';
  /** Day of birth */
  dob: Maybe<Scalars['String']['output']>;
  /** Email */
  email: Maybe<Scalars['String']['output']>;
  /** First name */
  firstName: Maybe<Scalars['String']['output']>;
  /** Unique fan ID */
  id: Maybe<Scalars['ID']['output']>;
  /** Last name */
  lastName: Maybe<Scalars['String']['output']>;
  /** Opt-in flag */
  optInPartners: Maybe<Scalars['Boolean']['output']>;
  /** Phone number */
  phoneNumber: Maybe<Scalars['String']['output']>;
};

export type FanSurveyAnswer = {
  __typename?: 'FanSurveyAnswer';
  /** Related fan survey question */
  fanSurveyQuestion: Maybe<FanSurveyQuestion>;
  /** Fan survey answer */
  value: Maybe<Scalars['String']['output']>;
};

export type FanSurveyQuestion = {
  __typename?: 'FanSurveyQuestion';
  /** Fan survey question description */
  title: Maybe<Scalars['String']['output']>;
};

export type Genre = Node & {
  __typename?: 'Genre';
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Name */
  name: Scalars['String']['output'];
};

export type GenreConnection = {
  __typename?: 'GenreConnection';
  edges: Maybe<Array<Maybe<GenreEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type GenreEdge = {
  __typename?: 'GenreEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<Genre>;
};

export type GenreType = Node & {
  __typename?: 'GenreType';
  /** Child Genres */
  genres: Maybe<GenreConnection>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Name */
  name: Scalars['String']['output'];
};


export type GenreTypeGenresArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type GenreTypeWhereInput = {
  name?: InputMaybe<OperatorsStringInput>;
};

export type GenreTypesConnection = {
  __typename?: 'GenreTypesConnection';
  edges: Maybe<Array<Maybe<GenreTypesEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type GenreTypesEdge = {
  __typename?: 'GenreTypesEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<GenreType>;
};

export type Image = {
  __typename?: 'Image';
  /** Type of the image. See EventImageType enum for the list of avaliable values */
  type: Maybe<EventImageType>;
  /** CDN url to image */
  url: Scalars['String']['output'];
};

export type Node = {
  /** The ID of the object. */
  id: Scalars['ID']['output'];
};

export type OperatorsDateInput = {
  /** Between the provided datetimes */
  between?: InputMaybe<Array<InputMaybe<Scalars['Datetime']['input']>>>;
  /** Greater than */
  gt?: InputMaybe<Scalars['Datetime']['input']>;
  /** Greater or equal to */
  gte?: InputMaybe<Scalars['Datetime']['input']>;
  /** Less than */
  lt?: InputMaybe<Scalars['Datetime']['input']>;
  /** Less or equal to */
  lte?: InputMaybe<Scalars['Datetime']['input']>;
  /** Not between the provided datetimes */
  notBetween?: InputMaybe<Array<InputMaybe<Scalars['Datetime']['input']>>>;
  /** Is null */
  null?: InputMaybe<Scalars['Boolean']['input']>;
};

export type OperatorsEventStateInput = {
  /** Equal to */
  eq?: InputMaybe<EventState>;
  /** In the list of provided values */
  in?: InputMaybe<Array<InputMaybe<EventState>>>;
  /** Not equal to */
  ne?: InputMaybe<EventState>;
  /** Not in the list of provided values */
  notIn?: InputMaybe<Array<InputMaybe<EventState>>>;
};

export type OperatorsIdInput = {
  /** Equal to */
  eq?: InputMaybe<Scalars['ID']['input']>;
  /** In the list of provided ids */
  in?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  /** Not equal to */
  ne?: InputMaybe<Scalars['ID']['input']>;
  /** Not in the list of provided ids */
  notIn?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
};

export type OperatorsStringInput = {
  /** Equal to */
  eq?: InputMaybe<Scalars['String']['input']>;
  /** In the list of provided values */
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  /** Not equal to */
  ne?: InputMaybe<Scalars['String']['input']>;
  /** Not in the list of provided values */
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Order = Node & {
  __typename?: 'Order';
  /** Shipping/Fan Address */
  address: Maybe<Address>;
  /** List of adjustments */
  adjustments: Maybe<Array<Maybe<Adjustment>>>;
  /** Partner commission in cents */
  commission: Maybe<Scalars['Int']['output']>;
  /** DICE commission in cents */
  diceCommission: Maybe<Scalars['Int']['output']>;
  /** Related event */
  event: Maybe<Event>;
  /** Order buyer */
  fan: Maybe<Fan>;
  /** Fees breakdown by category */
  fees: Maybe<Array<Maybe<TicketFee>>>;
  /** Price without commissions in cents */
  fullPrice: Maybe<Scalars['Int']['output']>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** IP based city */
  ipCity: Maybe<Scalars['String']['output']>;
  /** IP based country */
  ipCountry: Maybe<Scalars['String']['output']>;
  /** Date and time order was purchased. Field is available with restricted access */
  purchasedAt: Maybe<Scalars['Datetime']['output']>;
  /** Quantity of purchased tickets. Field is available with restricted access */
  quantity: Maybe<Scalars['Int']['output']>;
  /** List of returns */
  returns: Maybe<Array<Maybe<Return>>>;
  /** List of bought tickets */
  tickets: Maybe<Array<Maybe<Ticket>>>;
  /** Total price with commissions in cents. Field is available with restricted access */
  total: Maybe<Scalars['Int']['output']>;
};

export type OrderConnection = {
  __typename?: 'OrderConnection';
  edges: Maybe<Array<Maybe<OrderEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type OrderEdge = {
  __typename?: 'OrderEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<Order>;
};

export type OrderWhereInput = {
  eventId?: InputMaybe<OperatorsIdInput>;
  id?: InputMaybe<OperatorsIdInput>;
  purchasedAt?: InputMaybe<OperatorsDateInput>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor: Maybe<Scalars['String']['output']>;
};

export type PriceTier = {
  __typename?: 'PriceTier';
  allocation: Maybe<Scalars['Int']['output']>;
  /** Door sale Price */
  doorSalesPrice: Maybe<Scalars['Int']['output']>;
  faceValue: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  name: Maybe<Scalars['String']['output']>;
  price: Maybe<Scalars['Int']['output']>;
  time: Maybe<Scalars['Datetime']['output']>;
};

export enum PriceTierTypes {
  Allocation = 'allocation',
  Time = 'time'
}

export type Product = {
  __typename?: 'Product';
  /** Archived flag. Archived products are not available for purchasing. */
  archived: Maybe<Scalars['Boolean']['output']>;
  /** Description. Field is available with restricted access */
  description: Maybe<Scalars['String']['output']>;
  /** Face value */
  faceValue: Maybe<Scalars['Int']['output']>;
  /** Product unique id. Field is available with restricted access */
  id: Maybe<Scalars['ID']['output']>;
  /** Product name. Field is available with restricted access */
  name: Maybe<Scalars['String']['output']>;
  /** Ticket types linked to the product. Field is available with restricted access */
  ticketTypes: Maybe<Array<Maybe<TicketType>>>;
  /** Total product allocation quantity */
  totalAllocationQty: Maybe<Scalars['Int']['output']>;
};

export type Return = Node & {
  __typename?: 'Return';
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Related order */
  order: Maybe<Order>;
  /** Return reason */
  reason: Maybe<Scalars['String']['output']>;
  /** Returned at date and time */
  returnedAt: Maybe<Scalars['Datetime']['output']>;
  /** Related ticket */
  ticket: Maybe<Ticket>;
  /** Related ticket id */
  ticketId: Scalars['ID']['output'];
};

export type ReturnConnection = {
  __typename?: 'ReturnConnection';
  edges: Maybe<Array<Maybe<ReturnEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type ReturnEdge = {
  __typename?: 'ReturnEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<Return>;
};

export type ReturnWhereInput = {
  eventId?: InputMaybe<OperatorsIdInput>;
  id?: InputMaybe<OperatorsIdInput>;
  returnedAt?: InputMaybe<OperatorsDateInput>;
};

export type RootMutationType = {
  __typename?: 'RootMutationType';
  claimTickets: Maybe<ClaimTicketsPayload>;
};


export type RootMutationTypeClaimTicketsArgs = {
  input: ClaimTicketsInput;
};

export type RootQueryType = {
  __typename?: 'RootQueryType';
  node: Maybe<Node>;
  viewer: Maybe<Viewer>;
};


export type RootQueryTypeNodeArgs = {
  id: Scalars['ID']['input'];
};

export type Seat = {
  __typename?: 'Seat';
  /** Seat Name. Field is available with restricted access */
  name: Maybe<Scalars['String']['output']>;
};

export type SocialLink = {
  __typename?: 'SocialLink';
  campaign: Scalars['String']['output'];
  default: Scalars['Boolean']['output'];
  /** e.g. https://link.dice.fm/AE6xPxPd7jb */
  url: Scalars['String']['output'];
};

export type Ticket = Node & {
  __typename?: 'Ticket';
  /** Shipping/Fan Address */
  address: Maybe<Address>;
  /** When this ticket has been claimed. Field is available with restricted access */
  claimedAt: Maybe<Scalars['Datetime']['output']>;
  /** QR code. Field is available with restricted access  */
  code: Maybe<Scalars['String']['output']>;
  /** Partner commission in cents */
  commission: Maybe<Scalars['Int']['output']>;
  /** DICE commission in cents */
  diceCommission: Maybe<Scalars['Int']['output']>;
  extras: Maybe<Array<Maybe<Extra>>>;
  fanSurveyAnswers: Maybe<Array<Maybe<FanSurveyAnswer>>>;
  /** Fees breakdown by category */
  fees: Maybe<Array<Maybe<TicketFee>>>;
  /** Price without commissions in cents */
  fullPrice: Maybe<Scalars['Int']['output']>;
  /** Ticket holder. Field is available with restricted access */
  holder: Maybe<Fan>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Ticket price tier */
  priceTier: Maybe<PriceTier>;
  /** Seat. Field is available with restricted access */
  seat: Maybe<Seat>;
  /** Ticket type. Field is available with restricted access */
  ticketType: Maybe<TicketType>;
  /** Total price with commissions in cents. Field is available with restricted access */
  total: Maybe<Scalars['Int']['output']>;
};


export type TicketExtrasArgs = {
  where?: InputMaybe<TicketExtraWhereInput>;
};

export type TicketConnection = {
  __typename?: 'TicketConnection';
  edges: Maybe<Array<Maybe<TicketEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type TicketEdge = {
  __typename?: 'TicketEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<Ticket>;
};

export type TicketExtraWhereInput = {
  hasSeparateAccessBarcode?: InputMaybe<EqBooleanInput>;
  productId?: InputMaybe<OperatorsIdInput>;
};

export type TicketFee = {
  __typename?: 'TicketFee';
  category: Maybe<TicketFeeCategory>;
  dice: Maybe<Scalars['Int']['output']>;
  promoter: Maybe<Scalars['Int']['output']>;
};

export enum TicketFeeCategory {
  AdditionalPromoter = 'ADDITIONAL_PROMOTER',
  Booking = 'BOOKING',
  BoxOffice = 'BOX_OFFICE',
  CharityDonation = 'CHARITY_DONATION',
  Deposit = 'DEPOSIT',
  ExtraCharge = 'EXTRA_CHARGE',
  Facility = 'FACILITY',
  FoodAndBeverage = 'FOOD_AND_BEVERAGE',
  Fulfilment = 'FULFILMENT',
  MeetAndGreet = 'MEET_AND_GREET',
  PaidWaitingList = 'PAID_WAITING_LIST',
  Presale = 'PRESALE',
  Processing = 'PROCESSING',
  SalesTax = 'SALES_TAX',
  TierDiff = 'TIER_DIFF',
  Vendor = 'VENDOR',
  Venue = 'VENUE',
  VenueLevy = 'VENUE_LEVY'
}

export type TicketTransfer = Node & {
  __typename?: 'TicketTransfer';
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Related orders */
  orders: Maybe<Array<Maybe<Order>>>;
  /** Related tickets */
  tickets: Maybe<Array<Maybe<Ticket>>>;
  /** Transferred at date and time */
  transferredAt: Maybe<Scalars['Datetime']['output']>;
};

export type TicketTransferConnection = {
  __typename?: 'TicketTransferConnection';
  edges: Maybe<Array<Maybe<TicketTransferEdge>>>;
  pageInfo: PageInfo;
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type TicketTransferEdge = {
  __typename?: 'TicketTransferEdge';
  cursor: Maybe<Scalars['String']['output']>;
  node: Maybe<TicketTransfer>;
};

export type TicketTransferWhereInput = {
  eventId?: InputMaybe<OperatorsIdInput>;
  id?: InputMaybe<OperatorsIdInput>;
  transferredAt?: InputMaybe<OperatorsDateInput>;
};

export type TicketType = {
  __typename?: 'TicketType';
  /** Archived flag. Archived ticket types are not available for purchasing. */
  archived: Maybe<Scalars['Boolean']['output']>;
  /** Description. Field is available with restricted access */
  description: Maybe<Scalars['String']['output']>;
  /** Door sale Price */
  doorSalesPrice: Maybe<Scalars['Int']['output']>;
  /** External SKUs */
  externalSkus: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Face value */
  faceValue: Maybe<Scalars['Int']['output']>;
  /** Unique ID. Field is available with restricted access */
  id: Maybe<Scalars['ID']['output']>;
  /** Title. Field is available with restricted access */
  name: Maybe<Scalars['String']['output']>;
  /** Price */
  price: Maybe<Scalars['Int']['output']>;
  /** Type of price tiers. Can be either time or allocation if applicable */
  priceTierType: Maybe<PriceTierTypes>;
  /** List of associated Price Tiers */
  priceTiers: Maybe<Array<Maybe<PriceTier>>>;
  /** Total ticket allocation quantity */
  totalTicketAllocationQty: Maybe<Scalars['Int']['output']>;
};

export type TicketWhereInput = {
  claimAllowed?: InputMaybe<EqBooleanInput>;
  eventId?: InputMaybe<OperatorsIdInput>;
  fanPhoneNumber?: InputMaybe<EqStringInput>;
  fanSecureToken?: InputMaybe<EqStringInput>;
  id?: InputMaybe<OperatorsIdInput>;
  ticketTypeId?: InputMaybe<OperatorsIdInput>;
};

/**
 *   Validation messages are returned when mutation input does not meet the requirements.
 *   While client-side validation is highly recommended to provide the best User Experience,
 *   All inputs will always be validated server-side.
 *
 *   Some examples of validations are:
 *
 *   * Username must be at least 10 characters
 *   * Email field does not contain an email address
 *   * Birth Date is required
 *
 *   While GraphQL has support for required values, mutation data fields are always
 *   set to optional in our API. This allows 'required field' messages
 *   to be returned in the same manner as other validations. The only exceptions
 *   are id fields, which may be required to perform updates or deletes.
 *
 */
export type ValidationMessage = {
  __typename?: 'ValidationMessage';
  /** A unique error code for the type of validation used. */
  code: Scalars['String']['output'];
  /**
   * The input field that the error applies to. The field can be used to
   * identify which field the error message should be displayed next to in the
   * presentation layer.
   *
   * If there are multiple errors to display for a field, multiple validation
   * messages will be in the result.
   *
   * This field may be null in cases where an error cannot be applied to a specific field.
   *
   */
  field: Maybe<Scalars['String']['output']>;
  /**
   * A friendly error message, appropriate for display to the end user.
   *
   * The message is interpolated to include the appropriate variables.
   *
   * Example: `Username must be at least 10 characters`
   *
   * This message may change without notice, so we do not recommend you match against the text.
   * Instead, use the *code* field for matching.
   *
   */
  message: Maybe<Scalars['String']['output']>;
  /** A list of substitutions to be applied to a validation message template */
  options: Maybe<Array<Maybe<ValidationOption>>>;
  /**
   * A template used to generate the error message, with placeholders for option substiution.
   *
   * Example: `Username must be at least {count} characters`
   *
   * This message may change without notice, so we do not recommend you match against the text.
   * Instead, use the *code* field for matching.
   *
   */
  template: Maybe<Scalars['String']['output']>;
};

export type ValidationOption = {
  __typename?: 'ValidationOption';
  /** The name of a variable to be subsituted in a validation message template */
  key: Scalars['String']['output'];
  /** The value of a variable to be substituted in a validation message template */
  value: Scalars['String']['output'];
};

export type Variant = {
  __typename?: 'Variant';
  /** Variant unique ID */
  id: Maybe<Scalars['ID']['output']>;
  /** Variant name */
  name: Maybe<Scalars['String']['output']>;
  /** Variant size */
  size: Maybe<Scalars['String']['output']>;
  /** Variant SKU */
  sku: Maybe<Scalars['String']['output']>;
};

export type Venue = {
  __typename?: 'Venue';
  /** Age limit */
  ageLimit: Maybe<Scalars['String']['output']>;
  /** City */
  city: Maybe<Scalars['String']['output']>;
  /** Country */
  country: Maybe<Scalars['String']['output']>;
  /** Displayed address */
  displayedAddress: Maybe<Scalars['String']['output']>;
  /** Latitude */
  latitude: Maybe<Scalars['Float']['output']>;
  /** Longitude */
  longitude: Maybe<Scalars['Float']['output']>;
  /** Title. Field is available with restricted access */
  name: Maybe<Scalars['String']['output']>;
  /** Post office box number */
  postOfficeBoxNumber: Maybe<Scalars['String']['output']>;
  /** Postal code */
  postalCode: Maybe<Scalars['String']['output']>;
  /** Region/Province */
  region: Maybe<Scalars['String']['output']>;
  /** State */
  state: Maybe<Scalars['String']['output']>;
  /** Street address */
  streetAddress: Maybe<Scalars['String']['output']>;
  /** Timezone name */
  timezoneName: Maybe<Scalars['String']['output']>;
  /** Type */
  type: Maybe<Scalars['String']['output']>;
};

/** The currently authenticated partner. */
export type Viewer = Node & {
  __typename?: 'Viewer';
  /** Paginated list of events. Field is available with restricted access */
  events: Maybe<EventConnection>;
  /** Paginated list of extras. Field is available with restricted access */
  extras: Maybe<ExtraConnection>;
  /** Paginated list of event genre types */
  genreTypes: Maybe<GenreTypesConnection>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Name */
  name: Maybe<Scalars['String']['output']>;
  /** Paginated list of orders. Field is available with restricted access */
  orders: Maybe<OrderConnection>;
  /** Paginated list of returns */
  returns: Maybe<ReturnConnection>;
  /** Paginated list of ticket transfers */
  ticketTransfers: Maybe<TicketTransferConnection>;
  /** Paginated list of tickets. Field is available with restricted access */
  tickets: Maybe<TicketConnection>;
};


/** The currently authenticated partner. */
export type ViewerEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<EventWhereInput>;
};


/** The currently authenticated partner. */
export type ViewerExtrasArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ExtraWhereInput>;
};


/** The currently authenticated partner. */
export type ViewerGenreTypesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<GenreTypeWhereInput>;
};


/** The currently authenticated partner. */
export type ViewerOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<OrderWhereInput>;
};


/** The currently authenticated partner. */
export type ViewerReturnsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ReturnWhereInput>;
};


/** The currently authenticated partner. */
export type ViewerTicketTransfersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TicketTransferWhereInput>;
};


/** The currently authenticated partner. */
export type ViewerTicketsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TicketWhereInput>;
};

export type PageInfoFieldsFragment = { __typename?: 'PageInfo', endCursor: string | null, hasNextPage: boolean };

export type GetEventsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type GetEventsQuery = { __typename?: 'RootQueryType', viewer: { __typename?: 'Viewer', events: { __typename?: 'EventConnection', totalCount: number | null, edges: Array<{ __typename?: 'EventEdge', node: { __typename?: 'Event', id: string, name: string | null, state: EventState | null, startDatetime: string | null, endDatetime: string | null, description: string | null, currency: EventCostCurrency | null, ticketTypes: Array<{ __typename?: 'TicketType', id: string | null, name: string | null, description: string | null, archived: boolean | null, price: number | null } | null> | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', endCursor: string | null, hasNextPage: boolean } } | null } | null };

export type GetOrdersQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  fromDate: Scalars['Datetime']['input'];
  toDate?: InputMaybe<Scalars['Datetime']['input']>;
}>;


export type GetOrdersQuery = { __typename?: 'RootQueryType', viewer: { __typename?: 'Viewer', orders: { __typename?: 'OrderConnection', totalCount: number | null, edges: Array<{ __typename?: 'OrderEdge', node: { __typename?: 'Order', id: string, purchasedAt: string | null, event: { __typename?: 'Event', id: string } | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', endCursor: string | null, hasNextPage: boolean } } | null } | null };

export type GetReturnsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  fromDate: Scalars['Datetime']['input'];
  toDate?: InputMaybe<Scalars['Datetime']['input']>;
}>;


export type GetReturnsQuery = { __typename?: 'RootQueryType', viewer: { __typename?: 'Viewer', returns: { __typename?: 'ReturnConnection', totalCount: number | null, edges: Array<{ __typename?: 'ReturnEdge', node: { __typename?: 'Return', id: string, returnedAt: string | null, order: { __typename?: 'Order', event: { __typename?: 'Event', id: string } | null } | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', endCursor: string | null, hasNextPage: boolean } } | null } | null };

export type GetTicketTransfersQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  fromDate: Scalars['Datetime']['input'];
  toDate?: InputMaybe<Scalars['Datetime']['input']>;
}>;


export type GetTicketTransfersQuery = { __typename?: 'RootQueryType', viewer: { __typename?: 'Viewer', ticketTransfers: { __typename?: 'TicketTransferConnection', totalCount: number | null, edges: Array<{ __typename?: 'TicketTransferEdge', node: { __typename?: 'TicketTransfer', id: string, transferredAt: string | null, orders: Array<{ __typename?: 'Order', event: { __typename?: 'Event', id: string } | null } | null> | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', endCursor: string | null, hasNextPage: boolean } } | null } | null };

export type GetTicketsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  eventId: Scalars['ID']['input'];
}>;


export type GetTicketsQuery = { __typename?: 'RootQueryType', viewer: { __typename?: 'Viewer', tickets: { __typename?: 'TicketConnection', totalCount: number | null, edges: Array<{ __typename?: 'TicketEdge', node: { __typename?: 'Ticket', id: string, fullPrice: number | null, ticketType: { __typename?: 'TicketType', id: string | null } | null, fees: Array<{ __typename?: 'TicketFee', category: TicketFeeCategory | null, promoter: number | null, dice: number | null } | null> | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', endCursor: string | null, hasNextPage: boolean } } | null } | null };

export const PageInfoFieldsFragmentDoc = gql`
    fragment PageInfoFields on PageInfo {
  endCursor
  hasNextPage
}
    `;
export const GetEventsDocument = gql`
    query GetEvents($first: Int = 50, $after: String, $ids: [ID!]!) {
  viewer {
    events(first: $first, after: $after, where: {id: {in: $ids}}) {
      edges {
        node {
          id
          name
          state
          startDatetime
          endDatetime
          description
          currency
          ticketTypes {
            id
            name
            description
            archived
            price
          }
        }
      }
      pageInfo {
        ...PageInfoFields
      }
      totalCount
    }
  }
}
    ${PageInfoFieldsFragmentDoc}`;
export const GetOrdersDocument = gql`
    query GetOrders($first: Int = 50, $after: String, $fromDate: Datetime!, $toDate: Datetime) {
  viewer {
    orders(
      first: $first
      after: $after
      where: {purchasedAt: {gte: $fromDate, lte: $toDate}}
    ) {
      edges {
        node {
          id
          purchasedAt
          event {
            id
          }
        }
      }
      pageInfo {
        ...PageInfoFields
      }
      totalCount
    }
  }
}
    ${PageInfoFieldsFragmentDoc}`;
export const GetReturnsDocument = gql`
    query GetReturns($first: Int = 50, $after: String, $fromDate: Datetime!, $toDate: Datetime) {
  viewer {
    returns(
      first: $first
      after: $after
      where: {returnedAt: {gte: $fromDate, lte: $toDate}}
    ) {
      edges {
        node {
          id
          returnedAt
          order {
            event {
              id
            }
          }
        }
      }
      pageInfo {
        ...PageInfoFields
      }
      totalCount
    }
  }
}
    ${PageInfoFieldsFragmentDoc}`;
export const GetTicketTransfersDocument = gql`
    query GetTicketTransfers($first: Int = 50, $after: String, $fromDate: Datetime!, $toDate: Datetime) {
  viewer {
    ticketTransfers(
      first: $first
      after: $after
      where: {transferredAt: {gte: $fromDate, lte: $toDate}}
    ) {
      edges {
        node {
          id
          transferredAt
          orders {
            event {
              id
            }
          }
        }
      }
      pageInfo {
        ...PageInfoFields
      }
      totalCount
    }
  }
}
    ${PageInfoFieldsFragmentDoc}`;
export const GetTicketsDocument = gql`
    query GetTickets($first: Int = 50, $after: String, $eventId: ID!) {
  viewer {
    tickets(first: $first, after: $after, where: {eventId: {eq: $eventId}}) {
      edges {
        node {
          id
          fullPrice
          ticketType {
            id
          }
          fees {
            category
            promoter
            dice
          }
        }
      }
      pageInfo {
        ...PageInfoFields
      }
      totalCount
    }
  }
}
    ${PageInfoFieldsFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    GetEvents(variables: GetEventsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetEventsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetEventsQuery>({ document: GetEventsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetEvents', 'query', variables);
    },
    GetOrders(variables: GetOrdersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetOrdersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetOrdersQuery>({ document: GetOrdersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetOrders', 'query', variables);
    },
    GetReturns(variables: GetReturnsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetReturnsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetReturnsQuery>({ document: GetReturnsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetReturns', 'query', variables);
    },
    GetTicketTransfers(variables: GetTicketTransfersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTicketTransfersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTicketTransfersQuery>({ document: GetTicketTransfersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTicketTransfers', 'query', variables);
    },
    GetTickets(variables: GetTicketsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTicketsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTicketsQuery>({ document: GetTicketsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTickets', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;