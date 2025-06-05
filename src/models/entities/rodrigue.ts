import { z } from 'zod';

import { transformStringOrNull, transformTimestampOrNull } from '@ad/src/utils/validation';
import { applyTypedParsers } from '@ad/src/utils/zod';

//
// [WARNING]
// We commented out the majority of properties because the remote API is returning sometimes unexpected values
// and it's really hard to handle all cases since there is not a clear documentation to anticipate them.
//
// This is the best way to make the production not breaking for unused fields during validation.
//

export const JsonEventSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      eventId: z.number().int().nonnegative(),
      // organizerId: z.number().int().nonnegative(),
      name: z.string().min(1),
      // shortName: z.string().transform(transformStringOrNull),
      // presentation1: z.string().min(1),
      // presentation2: z.string().min(1),
      // thumbnail: z.string().url(),
      // cover: z.string().url(),
      // formattedDate: z.unknown().nullable(),
      // stockAvailabilityStatus: z.unknown(),
      // salesStatus: z.unknown(),
      productType: z.literal('event').or(z.string().min(1)),
      // isSalePriority: z.boolean(),
      // isSalePriorityExclusive: z.boolean(),
      // groupingList: z.array(z.unknown()),
    })
    .strip()
);
export type JsonEventSchemaType = z.infer<typeof JsonEventSchema>;

export const JsonEventDetailsSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      name: z.string().min(1),
      // shortName: z.string().transform(transformStringOrNull),
      // producer1: z.string().min(1),
      // producer2: z.string().min(1),
      // sponsor: z.string().min(1),
      vatPercentage: z.coerce.number().nonnegative(),
      // keywords: z.string().transform(transformStringOrNull),
      // prodLicence: z.string().min(1),
      // facebook: z.string().transform(transformStringOrNull),
      categoryId: z.number().int().nonnegative(),
      // subCategoryId: z.number().int().nonnegative(),
      // externalVideos: z.unknown().nullable(),
      // minimumAge: z.unknown().nullable(),
      // presentation1: z.string().min(1),
      // presentation2: z.string().min(1),
      // walletCode: z.string().transform(transformStringOrNull),
      productType: z.literal('event').or(z.string().min(1)),
      // formattedDate: z.string().transform(transformStringOrNull),
      // thumbnail: z.string().url(),
      // cover: z.string().url(),
      // holderFields: z.array(
      //   z.object({
      //     property: z.string().min(1),
      //     label: z.string().min(1),
      //     required: z.boolean(),
      //   })
      // ),
    })
    .strip()
);
export type JsonEventDetailsSchemaType = z.infer<typeof JsonEventDetailsSchema>;

export const JsonShowSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      start: z.coerce.date(),
      end: z.coerce.date(),
      salesStart: z.coerce.date(),
      salesEnd: z.coerce.date(),
      // stockAvailabilityStatus: z.enum(['sold_out', 'in_stock', 'sold_out_in_cart']),
      // salesStatus: z.enum(['in_sale', 'finished', 'pending']),
      // specifiedSalesStart: z.unknown().nullable(),
      // specifiedSalesEnd: z.unknown().nullable(),
      // seatChoiceType: z.enum(['bySeats", "bySection", "byPrices", "mixed"']),
      // seatingMapId: z.number().int().nonnegative().nullable(),
      // venueId: z.number().int().nonnegative(),
      // isSalePriority: z.boolean(),
      // isSalePriorityExclusive: z.boolean(),
    })
    .strip()
);
export type JsonShowSchemaType = z.infer<typeof JsonShowSchema>;

export const JsonPriceSchema = applyTypedParsers(
  z
    .object({
      // priceBookingFees: z.array(z.unknown()),
      // requiredMembershipRules: z.array(z.unknown()),
      // sectionIdList: z.array(z.unknown()),
      id: z.number().int().nonnegative(),
      // shortName: z.string().transform(transformStringOrNull),
      name: z.string().min(1),
      valueCents: z.number().int().nonnegative(),
      valueWithoutFeesCents: z.number().int().nonnegative(),
      // requiredDocument: z.string().transform(transformStringOrNull),
      // accessCodeRequired: z.boolean(),
      // customerCategory: z.string().min(1),
      // priceType: z.number().int().nonnegative(),
      // isExclu: z.boolean(),
      // customerType: z.string().min(1),
      // customerTypeId: z.number().int().nonnegative(),
      // priceCategory: z.string().min(1),
      // priceCategoryId: z.number().int().nonnegative(),
      // isAutoAddToCartTrigger: z.boolean(),
      // haveRule: z.boolean(),
      // minQuantityPerCartAddition: z.number().int().nonnegative(),
      // maxQuantityPerCartAddition: z.number().int().nonnegative(),
      // multipleQuantityPerCartAddition: z.number().int().nonnegative(),
      // complementXml: z.unknown().nullable(),
      // position: z.number().int().nonnegative(),
      // totalAvailableSeats: z.number().int().nonnegative(),
      // maxQuantity: z.number().int().nonnegative(),
    })
    .strip()
);
export type JsonPriceSchemaType = z.infer<typeof JsonPriceSchema>;

export const JsonTransactionSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      // refBank: z.string().min(1),
      purchaseDate: z.object({
        date: z.coerce.date(),
        timezone_type: z.number().int().nonnegative(),
        timezone: z.literal('Europe/Paris').or(z.string().min(1)),
      }),
      // paymentInfos: z.string().transform(transformStringOrNull),
      // delivery: z.object({
      //   id: z.number().int().nonnegative(),
      //   name: z.string().min(1),
      //   amountCents: z.number().int().nonnegative(),
      // }),
      salesChannelId: z.number().int().nonnegative(),
      currencyId: z.number().int().nonnegative(),
      tickets: z.array(z.number().int().nonnegative()),
      // "payments": z.array(z.unknown()),
      userId: z.number().int().nonnegative(),
      // "buyerFirstname": z.string().min(1),
      // "buyerLastname": z.string().min(1),
    })
    .strip()
);
export type JsonTransactionSchemaType = z.infer<typeof JsonTransactionSchema>;

export const JsonEntrySchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      ticketId: z.number().int().nonnegative(),
      // seatId: z.number().int().nonnegative().nullable(),
      // seatRank: z.string().transform(transformStringOrNull),
      // seatNumber: z.string().transform(transformStringOrNull),
      // gate: z.string().transform(transformStringOrNull),
      // sectionName: z.string().transform(transformStringOrNull),
      showId: z.number().int().nonnegative(),
      eventId: z.number().int().nonnegative(),
      priceLabel: z.string().min(1),
      // placementPartner: z.string().transform(transformStringOrNull),
      deleted: z.boolean(),
      // generated: z.boolean(),
      // lastMailSent: z.unknown().nullable(),
      // holderFirstname: z.string().transform(transformStringOrNull),
      // holderLastname: z.string().transform(transformStringOrNull),
      // ticketPath: z.string().min(1),
      // deliveryModeId: z.number().int().nonnegative(),
      // printable: z.boolean(),
      // visible: z.boolean(),
      // formatedLabel: z.string().transform(transformStringOrNull),
      // barcode: z.string().min(1),
      priceAmountCents: z.number().int().nonnegative(),
      // showStartDate: z.object({
      //   date: z.coerce.date(),
      //   timezone_type: z.number().int().nonnegative(),
      //   timezone: z.literal('Europe/Paris').or(z.string().min(1)),
      // }),
      // eventName: z.string().min(1),
      // buyerLastname: z.string().min(1),
      // buyerFirstname: z.string().min(1),
      transactionId: z.number().int().nonnegative(),
    })
    .strip()
);
export type JsonEntrySchemaType = z.infer<typeof JsonEntrySchema>;

export const JsonCollectionSchema = applyTypedParsers(z.object({}));
export type JsonCollectionSchemaType = z.infer<typeof JsonCollectionSchema>;

export const JsonListEventsResponseSchema = JsonCollectionSchema.extend({
  _embedded: z.object({
    products: z.array(JsonEventSchema),
  }),
});
export type JsonListEventsResponseSchemaType = z.infer<typeof JsonListEventsResponseSchema>;

export const JsonListShowsResponseSchema = JsonCollectionSchema.extend({
  _embedded: z.object({
    shows: z.array(JsonShowSchema),
  }),
});
export type JsonListShowsResponseSchemaType = z.infer<typeof JsonListShowsResponseSchema>;

export const JsonListPricesResponseSchema = JsonCollectionSchema.extend({
  _embedded: z.object({
    prices: z.array(JsonPriceSchema),
  }),
});
export type JsonListPricesResponseSchemaType = z.infer<typeof JsonListPricesResponseSchema>;

export const JsonListTransactionsResponseSchema = JsonCollectionSchema.extend({
  _embedded: z.object({
    transactions: z.array(JsonTransactionSchema),
  }),
});
export type JsonListTransactionsResponseSchemaType = z.infer<typeof JsonListTransactionsResponseSchema>;

export const JsonListEntriesResponseSchema = JsonCollectionSchema.extend({
  _embedded: z.object({
    entries: z.array(JsonEntrySchema),
  }),
});
export type JsonListEntriesResponseSchemaType = z.infer<typeof JsonListEntriesResponseSchema>;

export const JsonGetEventsDetailsResponseSchema = JsonEventDetailsSchema;
export type JsonGetEventsDetailsResponseSchemaType = z.infer<typeof JsonGetEventsDetailsResponseSchema>;
