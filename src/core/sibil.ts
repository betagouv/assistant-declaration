import fs from 'fs/promises';
import path from 'path';
import z from 'zod';

import { getFlattenEventsForSibilDeclaration } from '@ad/src/core/declaration/format';
import { JsonSibilDeclarationSchemaType, JsonSibilDeclarationsExportSchema, SibilDeclarationSchema } from '@ad/src/models/entities/declaration/sibil';
import { prisma } from '@ad/src/prisma/client';
import { declarationPrismaToModel } from '@ad/src/server/routers/mappers';

const __root_dirname = process.cwd();

const localJsonPath = path.resolve(__root_dirname, './data/sibil-statistics.json');
const localJsonSchemaPath = path.resolve(__root_dirname, './data/sibil-statistics-schema.json');

export async function exportSibilStatistics(options: { fromDate: Date; toDate: Date }) {
  console.log(`starting the export of sibil statistics from the platform, it may take up to 30 seconds`);

  // Find all declared events series within this timeframe
  const eventsSeries = await prisma.eventSerie.findMany({
    where: {
      EventSerieDeclaration: {
        some: {
          transmittedAt: {
            gte: options.fromDate,
            lt: options.toDate, // Excludes this one for the next export
          },
        },
      },
    },
    select: {
      id: true,
      internalTicketingSystemId: true,
      ticketingSystemId: true,
      name: true,
      producerOfficialId: true,
      producerName: true,
      performanceType: true,
      expectedDeclarationTypes: true,
      placeId: true,
      placeCapacity: true,
      audience: true,
      ticketingRevenueTaxRate: true,
      expensesIncludingTaxes: true,
      expensesExcludingTaxes: true,
      expensesTaxRate: true,
      introductionFeesExpensesIncludingTaxes: true,
      introductionFeesExpensesExcludingTaxes: true,
      introductionFeesExpensesTaxRate: true,
      circusSpecificExpensesIncludingTaxes: true,
      circusSpecificExpensesExcludingTaxes: true,
      circusSpecificExpensesTaxRate: true,
      createdAt: true,
      updatedAt: true,
      ticketingSystem: {
        select: {
          organization: {
            select: {
              id: true,
              name: true,
              officialId: true,
              officialHeadquartersId: true,
              headquartersAddressId: true,
              sacemId: true,
              sacdId: true,
              createdAt: true,
              updatedAt: true,
              headquartersAddress: true,
            },
          },
        },
      },
      place: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
      Event: {
        select: {
          id: true,
          internalTicketingSystemId: true,
          eventSerieId: true,
          startAt: true,
          endAt: true,
          ticketingRevenueIncludingTaxes: true,
          ticketingRevenueExcludingTaxes: true,
          ticketingRevenueDefinedTaxRate: true,
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
          freeTickets: true,
          paidTickets: true,
          placeOverrideId: true,
          placeCapacityOverride: true,
          audienceOverride: true,
          ticketingRevenueTaxRateOverride: true,
          createdAt: true,
          updatedAt: true,
          placeOverride: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      },
    },
  });

  const jsonSibilDeclarationsExport = eventsSeries.map((eventSerie): JsonSibilDeclarationSchemaType => {
    const agnosticDeclaration = declarationPrismaToModel({
      ...eventSerie,
      AttachmentsOnEventSeries: [], // No need to retrieve them
    });

    // Make sure it has at least a valid structure due to union between other organisms fields
    const sibilDeclaration = SibilDeclarationSchema.parse(agnosticDeclaration);

    const { audience, place, placeCapacity, ticketingRevenueTaxRate, ...jsonEventSerie } = sibilDeclaration.eventSerie; // Omit specific property

    return {
      organization: sibilDeclaration.organization,
      eventSerie: jsonEventSerie,
      events: getFlattenEventsForSibilDeclaration(sibilDeclaration).map((flattenEvent) => {
        return {
          ...flattenEvent,
          // The following transformation is needed because we have to use ISO date string for the JSON schema to work properly
          startAt: flattenEvent.startAt.toISOString(),
          endAt: flattenEvent.endAt ? flattenEvent.endAt.toISOString() : null,
        };
      }),
    } satisfies JsonSibilDeclarationSchemaType;
  });

  await fs.writeFile(localJsonPath, JSON.stringify(jsonSibilDeclarationsExport, null, 2));
}

export async function generateSibilDeclarationsExportJsonSchema() {
  const jsonSchema = z.toJSONSchema(JsonSibilDeclarationsExportSchema);

  await fs.writeFile(localJsonSchemaPath, JSON.stringify(jsonSchema, null, 2));
}
