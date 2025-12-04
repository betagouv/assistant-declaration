import { z } from 'zod';

import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import {
  EventSchema,
  EventSerieSchema,
  StricterEventSchema,
  StricterEventSerieSchema,
  assertAmountsRespectTaxLogic,
  assertValidExpenses,
} from '@ad/src/models/entities/event';
import { OrganizationSchema, StricterOrganizationSchema } from '@ad/src/models/entities/organization';
import { PlaceSchema } from '@ad/src/models/entities/place';

// For now SIBIL statistics foramt is kind of an union or all other organisms
export const SibilDeclarationSchema = DeclarationSchema.extend({
  organization: StricterOrganizationSchema.pick({
    id: true,
    name: true,
    officialId: true,
    officialHeadquartersId: true,
  })
    .extend(
      OrganizationSchema.pick({
        sacemId: true,
        sacdId: true,
      }).shape
    )
    .strip(),
  eventSerie: StricterEventSerieSchema.pick({
    id: true,
    name: true,
    performanceType: true,
    expectedDeclarationTypes: true,
    placeCapacity: true,
    audience: true,
    ticketingRevenueTaxRate: true,
    expensesIncludingTaxes: true,
    expensesExcludingTaxes: true,
    introductionFeesExpensesIncludingTaxes: true,
    introductionFeesExpensesExcludingTaxes: true,
  })
    .extend(
      EventSerieSchema.pick({
        producerOfficialId: true,
        producerName: true,
        circusSpecificExpensesIncludingTaxes: true,
        circusSpecificExpensesExcludingTaxes: true,
      }).shape
    )
    .extend({
      place: PlaceSchema,
    })
    .superRefine((data, ctx) => {
      // Had to be reapplied since we picked up a few properties
      assertValidExpenses(data, ctx);
      assertAmountsRespectTaxLogic(data, 'expensesExcludingTaxes', 'expensesIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'introductionFeesExpensesExcludingTaxes', 'introductionFeesExpensesIncludingTaxes', ctx);
      assertAmountsRespectTaxLogic(data, 'circusSpecificExpensesExcludingTaxes', 'circusSpecificExpensesIncludingTaxes', ctx);
    })
    .strip(),
  events: z.array(
    StricterEventSchema.pick({
      id: true,
      startAt: true,
      ticketingRevenueIncludingTaxes: true,
      ticketingRevenueExcludingTaxes: true,
      freeTickets: true,
      paidTickets: true,
    })
      .extend(
        EventSchema.pick({
          endAt: true,
          consumptionsRevenueIncludingTaxes: true,
          consumptionsRevenueExcludingTaxes: true,
          consumptionsRevenueTaxRate: true,
          cateringRevenueIncludingTaxes: true,
          cateringRevenueExcludingTaxes: true,
          cateringRevenueTaxRate: true,
          programSalesRevenueIncludingTaxes: true,
          programSalesRevenueExcludingTaxes: true,
          programSalesRevenueTaxRate: true,
          otherRevenueIncludingTaxes: true,
          otherRevenueExcludingTaxes: true,
          otherRevenueTaxRate: true,
          // Since that's overrides there are not required
          placeCapacityOverride: true,
          audienceOverride: true,
          ticketingRevenueTaxRateOverride: true,
        }).shape
      )
      .extend({
        placeOverride: PlaceSchema.nullable(),
      })
      .superRefine((data, ctx) => {
        // `.pick` won't propagate picked `.superRefine` so we have to apply it here again
        assertAmountsRespectTaxLogic(data, 'ticketingRevenueExcludingTaxes', 'ticketingRevenueIncludingTaxes', ctx);
        assertAmountsRespectTaxLogic(data, 'consumptionsRevenueExcludingTaxes', 'consumptionsRevenueIncludingTaxes', ctx);
        assertAmountsRespectTaxLogic(data, 'cateringRevenueExcludingTaxes', 'cateringRevenueIncludingTaxes', ctx);
        assertAmountsRespectTaxLogic(data, 'programSalesRevenueExcludingTaxes', 'programSalesRevenueIncludingTaxes', ctx);
        assertAmountsRespectTaxLogic(data, 'otherRevenueExcludingTaxes', 'otherRevenueIncludingTaxes', ctx);
      })
      .strip()
  ),
});
export type SibilDeclarationSchemaType = z.infer<typeof SibilDeclarationSchema>;

// This is useful to avoid in multiple locations of the code trying to search for the default value to display it
// It will ensure no isolate issue over time
export const FlattenSibilEventSchema = StricterEventSchema.pick({
  id: true,
  startAt: true,
  ticketingRevenueIncludingTaxes: true,
  ticketingRevenueExcludingTaxes: true,
  freeTickets: true,
  paidTickets: true,
})
  .extend({
    place: PlaceSchema,
  })
  .extend(
    EventSchema.pick({
      endAt: true,
      consumptionsRevenueIncludingTaxes: true,
      consumptionsRevenueExcludingTaxes: true,
      consumptionsRevenueTaxRate: true,
      cateringRevenueIncludingTaxes: true,
      cateringRevenueExcludingTaxes: true,
      cateringRevenueTaxRate: true,
      programSalesRevenueIncludingTaxes: true,
      programSalesRevenueExcludingTaxes: true,
      programSalesRevenueTaxRate: true,
      otherRevenueIncludingTaxes: true,
      otherRevenueExcludingTaxes: true,
      otherRevenueTaxRate: true,
    }).shape
  )
  .extend(
    StricterEventSerieSchema.pick({
      ticketingRevenueTaxRate: true,
      placeCapacity: true,
      audience: true,
    }).shape
  );
export type FlattenSibilEventSchemaType = z.infer<typeof FlattenSibilEventSchema>;

export const JsonFlattenSibilEventSchema = FlattenSibilEventSchema.extend({
  // `Date` object is considered as unrepresentable when generating the JSON schema (ref: https://zod.dev/json-schema?id=unrepresentable)
  // so overriding this type just here to make sure the schema documentation is explicit enough
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime().nullable(),
});
export type JsonFlattenSibilEventSchemaType = z.infer<typeof JsonFlattenSibilEventSchema>;

// For now we are exporting a JSON file instead of using SIBIL API, so having our own schema
export const JsonSibilDeclarationSchema = SibilDeclarationSchema.pick({
  organization: true,
}).extend({
  eventSerie: SibilDeclarationSchema.shape.eventSerie.omit({
    audience: true,
    place: true,
    placeCapacity: true,
    ticketingRevenueTaxRate: true,
  }),
  events: z.array(JsonFlattenSibilEventSchema),
  // signatory: z.string().min(1),
});
export type JsonSibilDeclarationSchemaType = z.infer<typeof JsonSibilDeclarationSchema>;

export const JsonSibilDeclarationsExportSchema = z.array(JsonSibilDeclarationSchema);
export type JsonSibilDeclarationsExportSchemaType = z.infer<typeof JsonSibilDeclarationsExportSchema>;
