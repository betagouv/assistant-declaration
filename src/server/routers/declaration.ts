import { EventSerieDeclarationStatus, Prisma } from '@prisma/client';

import { ensureMinimumSacemExpenseItems, ensureMinimumSacemRevenueItems } from '@ad/src/core/declaration';
import { FillSacemDeclarationSchema, GetSacemDeclarationSchema } from '@ad/src/models/actions/declaration';
import {
  AccountingCategorySchema,
  AccountingFluxSchema,
  LiteSacemDeclarationAccountingEntrySchemaType,
  SacemDeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration';
import { eventSerieNotFoundError, organizationCollaboratorRoleRequiredError } from '@ad/src/models/entities/errors';
import { prisma } from '@ad/src/prisma/client';
import { sacemDeclarationPrismaToModel, sacemPlaceholderDeclarationPrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { getDiff } from '@ad/src/utils/comparaison';

export const declarationRouter = router({
  getSacemDeclaration: privateProcedure.input(GetSacemDeclarationSchema).query(async ({ ctx, input }) => {
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
      },
      select: {
        id: true,
        name: true,
        startAt: true,
        endAt: true,
        taxRate: true,
        ticketingSystem: {
          select: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        EventSerieDeclaration: {
          select: {
            id: true,
            EventSerieSacemDeclaration: {
              select: {
                id: true,
                clientId: true,
                placeName: true,
                placeCapacity: true,
                managerName: true,
                managerTitle: true,
                performanceType: true,
                declarationPlace: true,
                SacemDeclarationAccountingEntry: {
                  select: {
                    flux: true,
                    category: true,
                    categoryPrecision: true,
                    taxRate: true,
                    amount: true,
                  },
                },
              },
            },
          },
        },
        Event: {
          select: {
            EventCategoryTickets: {
              select: {
                total: true,
                totalOverride: true,
                priceOverride: true,
                category: {
                  select: {
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!eventSerie) {
      throw eventSerieNotFoundError;
    }

    // Before returning, make sure the caller has rights on this authority ;)
    if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    // Get suggestions from previous declarations to ease the filling of the form
    // Note: `distinct` cannot be done on different properties get unique values, `groupBy` cannot have an orderBy+limit, so using `findMany` with local logic
    const previousDeclarations = await prisma.eventSerieSacemDeclaration.findMany({
      where: {
        eventSerieDeclaration: {
          eventSerie: {
            ticketingSystem: {
              organizationId: eventSerie.ticketingSystem.organization.id,
            },
          },
        },
      },
      select: {
        clientId: true,
        placeName: true,
        placeCapacity: true,
        managerName: true,
        managerTitle: true,
        performanceType: true,
        declarationPlace: true,
        SacemDeclarationAccountingEntry: {
          select: {
            flux: true,
            category: true,
            categoryPrecision: true,
            taxRate: true,
            amount: true,
          },
        },
      },
      distinct: ['clientId', 'placeName', 'placeCapacity', 'managerName', 'managerTitle', 'performanceType', 'declarationPlace'], // At least the distinct may remove duplicates for the whole chain
      // Get only a few of the last declarations since it should representative
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    const { revenues, expenses, ...computedPlaceholder } = sacemPlaceholderDeclarationPrismaToModel(eventSerie);

    const placeholder: SacemDeclarationWrapperSchemaType['placeholder'] = {
      ...computedPlaceholder,
      clientId: [],
      placeName: [],
      placeCapacity: [],
      managerName: [],
      managerTitle: [],
      performanceType: [],
      declarationPlace: [],
      revenues: ensureMinimumSacemRevenueItems(revenues),
      expenses: ensureMinimumSacemExpenseItems(expenses),
      revenuesOptions: {
        ticketing: { taxRate: [], amount: [] },
        consumptions: { taxRate: [], amount: [] },
        catering: { taxRate: [], amount: [] },
        programSales: { taxRate: [], amount: [] },
        other: { taxRate: [], amount: [] },
        otherCategories: [],
      },
      expensesOptions: {
        engagementContracts: { taxRate: [], amount: [] },
        rightsTransferContracts: { taxRate: [], amount: [] },
        corealizationContracts: { taxRate: [], amount: [] },
        coproductionContracts: { taxRate: [], amount: [] },
        other: { taxRate: [], amount: [] },
        otherCategories: [],
      },
    };

    // Fill with unique values
    for (const previousDeclaration of previousDeclarations) {
      if (!placeholder.clientId.includes(previousDeclaration.clientId)) placeholder.clientId.push(previousDeclaration.clientId);
      if (!placeholder.placeName.includes(previousDeclaration.placeName)) placeholder.placeName.push(previousDeclaration.placeName);
      if (!placeholder.placeCapacity.includes(previousDeclaration.placeCapacity)) placeholder.placeCapacity.push(previousDeclaration.placeCapacity);
      if (!placeholder.managerName.includes(previousDeclaration.managerName)) placeholder.managerName.push(previousDeclaration.managerName);
      if (!placeholder.managerTitle.includes(previousDeclaration.managerTitle)) placeholder.managerTitle.push(previousDeclaration.managerTitle);
      if (!placeholder.performanceType.includes(previousDeclaration.performanceType))
        placeholder.performanceType.push(previousDeclaration.performanceType);
      if (!placeholder.declarationPlace.includes(previousDeclaration.declarationPlace))
        placeholder.declarationPlace.push(previousDeclaration.declarationPlace);

      for (const accountingEntry of previousDeclaration.SacemDeclarationAccountingEntry) {
        // Amounts are specific to each series so there is no need of filling them as placeholders
        // TODO: we could reuse as placeholder entries for another declaration having the same accounting entry
        const taxRate = accountingEntry.taxRate.toNumber();

        if (accountingEntry.flux === 'REVENUE') {
          switch (accountingEntry.category) {
            case 'TICKETING':
              if (!placeholder.revenuesOptions.ticketing.taxRate.includes(taxRate)) placeholder.revenuesOptions.ticketing.taxRate.push(taxRate);
              break;
            case 'CONSUMPTIONS':
              if (!placeholder.revenuesOptions.consumptions.taxRate.includes(taxRate)) placeholder.revenuesOptions.consumptions.taxRate.push(taxRate);
              break;
            case 'CATERING':
              if (!placeholder.revenuesOptions.catering.taxRate.includes(taxRate)) placeholder.revenuesOptions.catering.taxRate.push(taxRate);
              break;
            case 'PROGRAM_SALES':
              if (!placeholder.revenuesOptions.programSales.taxRate.includes(taxRate)) placeholder.revenuesOptions.programSales.taxRate.push(taxRate);
              break;
            case 'OTHER_REVENUES':
              if (accountingEntry.categoryPrecision && !placeholder.revenuesOptions.otherCategories.includes(accountingEntry.categoryPrecision))
                placeholder.revenuesOptions.otherCategories.push(accountingEntry.categoryPrecision);
              if (!placeholder.revenuesOptions.other.taxRate.includes(taxRate)) placeholder.revenuesOptions.other.taxRate.push(taxRate);
              break;
          }
        } else if (accountingEntry.flux === 'EXPENSE') {
          switch (accountingEntry.category) {
            case 'ENGAGEMENT_CONTRACTS':
              if (!placeholder.expensesOptions.engagementContracts.taxRate.includes(taxRate))
                placeholder.expensesOptions.engagementContracts.taxRate.push(taxRate);
              break;
            case 'RIGHTS_TRANSFER_CONTRACTS':
              if (!placeholder.expensesOptions.rightsTransferContracts.taxRate.includes(taxRate))
                placeholder.expensesOptions.rightsTransferContracts.taxRate.push(taxRate);
              break;
            case 'COREALIZATION_CONTRACTS':
              if (!placeholder.expensesOptions.corealizationContracts.taxRate.includes(taxRate))
                placeholder.expensesOptions.corealizationContracts.taxRate.push(taxRate);
              break;
            case 'COPRODUCTION_CONTRACTS':
              if (!placeholder.expensesOptions.coproductionContracts.taxRate.includes(taxRate))
                placeholder.expensesOptions.coproductionContracts.taxRate.push(taxRate);
              break;
            case 'OTHER_ARTISTIC_CONTRACTS':
              if (accountingEntry.categoryPrecision && !placeholder.expensesOptions.otherCategories.includes(accountingEntry.categoryPrecision))
                placeholder.expensesOptions.otherCategories.push(accountingEntry.categoryPrecision);
              if (!placeholder.expensesOptions.other.taxRate.includes(taxRate)) placeholder.expensesOptions.other.taxRate.push(taxRate);
              break;
          }
        }
      }
    }

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

    // Note: the generated properties calculation is done 2 times but we are fine with that for now
    return {
      sacemDeclarationWrapper: {
        declaration: existingDeclaration ? sacemDeclarationPrismaToModel(eventSerie, existingDeclaration.EventSerieSacemDeclaration!) : null,
        placeholder: placeholder,
      } satisfies SacemDeclarationWrapperSchemaType,
    };
  }),
  fillSacemDeclaration: privateProcedure.input(FillSacemDeclarationSchema).mutation(async ({ ctx, input }) => {
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
      },
      select: {
        id: true,
        ticketingSystem: {
          select: {
            organizationId: true,
          },
        },
        EventSerieDeclaration: {
          select: {
            id: true,
            EventSerieSacemDeclaration: {
              select: {
                id: true,
                SacemDeclarationAccountingEntry: {
                  select: {
                    id: true,
                    flux: true,
                    category: true,
                    categoryPrecision: true,
                    taxRate: true,
                    amount: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!eventSerie) {
      throw eventSerieNotFoundError;
    }

    // Before returning, make sure the caller has rights on this authority ;)
    if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

    const submittedLiteAccountingEntries = new Map<
      string, // It's a mix of multiple fields to make sure we have a unique key
      LiteSacemDeclarationAccountingEntrySchemaType
    >();

    for (const revenue of input.revenues) {
      // [IMPORTANT] Since the ticketing entry is calculated from other tables we avoid the possibility of setting them
      // Note: it has the same type than other in the backend/frontend to facilitate the display and manipulation
      if (revenue.category === AccountingCategorySchema.Values.TICKETING) {
        continue;
      }

      submittedLiteAccountingEntries.set(`${AccountingFluxSchema.Values.REVENUE}_${revenue.category}_${revenue.categoryPrecision}`, {
        flux: AccountingFluxSchema.Values.REVENUE,
        category: revenue.category,
        categoryPrecision: revenue.categoryPrecision,
        taxRate: revenue.taxRate,
        includingTaxesAmount: revenue.includingTaxesAmount,
      });
    }

    for (const expense of input.expenses) {
      submittedLiteAccountingEntries.set(`${AccountingFluxSchema.Values.EXPENSE}_${expense.category}_${expense.categoryPrecision}`, {
        flux: AccountingFluxSchema.Values.EXPENSE,
        category: expense.category,
        categoryPrecision: expense.categoryPrecision,
        taxRate: expense.taxRate,
        includingTaxesAmount: expense.includingTaxesAmount,
      });
    }

    // We have to handle both update and creation since it's implicitely linked to an event serie
    // [WORKAROUND] `upsert` cannot be used to `where` not accepting undefined values (the zero UUID could be a bit at risk so using `create+update`)
    // Ref: https://github.com/prisma/prisma/issues/5233
    let sacemDeclaration;

    if (existingDeclaration) {
      assert(existingDeclaration.EventSerieSacemDeclaration);

      const sacemDeclarationId = existingDeclaration.EventSerieSacemDeclaration.id;

      const storedLiteAccountingEntries: typeof submittedLiteAccountingEntries = new Map();

      for (const accountingEntry of existingDeclaration.EventSerieSacemDeclaration!.SacemDeclarationAccountingEntry) {
        storedLiteAccountingEntries.set(`${accountingEntry.flux}_${accountingEntry.category}_${accountingEntry.categoryPrecision}`, {
          flux: accountingEntry.flux,
          category: accountingEntry.category,
          categoryPrecision: accountingEntry.categoryPrecision,
          taxRate: accountingEntry.taxRate.toNumber(),
          includingTaxesAmount: accountingEntry.amount.toNumber(),
        });
      }

      const accountingEntriesDiffResult = getDiff(storedLiteAccountingEntries, submittedLiteAccountingEntries);

      // Nullable field cannot be used as part of the unique compound... so we need to perform association mutations without unique constraints
      // Ref: https://github.com/prisma/prisma/issues/3197
      sacemDeclaration = await prisma.eventSerieSacemDeclaration.update({
        where: {
          id: sacemDeclarationId,
        },
        data: {
          clientId: input.clientId,
          placeName: input.placeName,
          placeCapacity: input.placeCapacity,
          managerName: input.managerName,
          managerTitle: input.managerTitle,
          performanceType: input.performanceType,
          declarationPlace: input.declarationPlace,
          SacemDeclarationAccountingEntry: {
            deleteMany: accountingEntriesDiffResult.removed.map((removedEntry) => {
              return {
                sacemDeclarationId: sacemDeclarationId,
                flux: removedEntry.flux,
                category: removedEntry.category,
                categoryPrecision: removedEntry.categoryPrecision,
              } satisfies Prisma.SacemDeclarationAccountingEntryScalarWhereInput;
            }),
            create: accountingEntriesDiffResult.added.map((addedEntry) => {
              return {
                flux: addedEntry.flux,
                category: addedEntry.category,
                categoryPrecision: addedEntry.categoryPrecision,
                taxRate: addedEntry.taxRate,
                amount: addedEntry.includingTaxesAmount,
              } satisfies Prisma.SacemDeclarationAccountingEntryCreateWithoutSacemDeclarationInput;
            }),
            updateMany: accountingEntriesDiffResult.updated.map((updatedEntry) => {
              return {
                where: {
                  sacemDeclarationId: sacemDeclarationId,
                  flux: updatedEntry.flux,
                  category: updatedEntry.category,
                  categoryPrecision: updatedEntry.categoryPrecision,
                },
                data: {
                  taxRate: updatedEntry.taxRate,
                  amount: updatedEntry.includingTaxesAmount,
                },
              } satisfies Prisma.SacemDeclarationAccountingEntryUpdateManyWithWhereWithoutSacemDeclarationInput;
            }),
          },
        },
        select: {
          id: true,
          clientId: true,
          placeName: true,
          placeCapacity: true,
          managerName: true,
          managerTitle: true,
          performanceType: true,
          declarationPlace: true,
          eventSerieDeclaration: {
            select: {
              id: true,
              eventSerie: {
                select: {
                  id: true,
                  name: true,
                  startAt: true,
                  endAt: true,
                  taxRate: true,
                  ticketingSystem: {
                    select: {
                      organization: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                  Event: {
                    select: {
                      EventCategoryTickets: {
                        select: {
                          total: true,
                          totalOverride: true,
                          priceOverride: true,
                          category: {
                            select: {
                              price: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          SacemDeclarationAccountingEntry: {
            select: {
              flux: true,
              category: true,
              categoryPrecision: true,
              taxRate: true,
              amount: true,
            },
          },
        },
      });
    } else {
      sacemDeclaration = await prisma.eventSerieSacemDeclaration.create({
        data: {
          clientId: input.clientId,
          placeName: input.placeName,
          placeCapacity: input.placeCapacity,
          managerName: input.managerName,
          managerTitle: input.managerTitle,
          performanceType: input.performanceType,
          declarationPlace: input.declarationPlace,
          eventSerieDeclaration: {
            create: {
              status: EventSerieDeclarationStatus.PENDING,
              eventSerieId: eventSerie.id,
            },
          },
          SacemDeclarationAccountingEntry: {
            create: Array.from(submittedLiteAccountingEntries).map(([_, entry]) => {
              return {
                flux: entry.flux,
                category: entry.category,
                categoryPrecision: entry.categoryPrecision,
                taxRate: entry.taxRate,
                amount: entry.includingTaxesAmount,
              };
            }),
          },
        },
        select: {
          id: true,
          clientId: true,
          placeName: true,
          placeCapacity: true,
          managerName: true,
          managerTitle: true,
          performanceType: true,
          declarationPlace: true,
          eventSerieDeclaration: {
            select: {
              id: true,
              eventSerie: {
                select: {
                  id: true,
                  name: true,
                  startAt: true,
                  endAt: true,
                  taxRate: true,
                  ticketingSystem: {
                    select: {
                      organization: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                  Event: {
                    select: {
                      EventCategoryTickets: {
                        select: {
                          total: true,
                          totalOverride: true,
                          priceOverride: true,
                          category: {
                            select: {
                              price: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          SacemDeclarationAccountingEntry: {
            select: {
              flux: true,
              category: true,
              categoryPrecision: true,
              taxRate: true,
              amount: true,
            },
          },
        },
      });
    }

    return {
      sacemDeclaration: sacemDeclarationPrismaToModel(sacemDeclaration.eventSerieDeclaration.eventSerie, sacemDeclaration),
    };
  }),
});
