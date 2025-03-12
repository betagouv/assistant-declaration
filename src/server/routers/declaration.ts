import { EventSerieDeclarationStatus, PhoneType, Prisma } from '@prisma/client';
import diff from 'microdiff';

import { ensureMinimumSacdAccountingItems, ensureMinimumSacemExpenseItems, ensureMinimumSacemRevenueItems } from '@ad/src/core/declaration';
import {
  FillSacdDeclarationSchema,
  FillSacemDeclarationSchema,
  GetSacdDeclarationSchema,
  GetSacemDeclarationSchema,
} from '@ad/src/models/actions/declaration';
import {
  LiteSacdDeclarationAccountingEntrySchemaType,
  LiteSacdDeclarationPerformedWorkSchemaType,
  SacdAudienceSchema,
  SacdDeclarationWrapperSchemaType,
  SacdProductionTypeSchema,
} from '@ad/src/models/entities/declaration/sacd';
import {
  AccountingCategorySchema,
  AccountingFluxSchema,
  LiteSacemDeclarationAccountingEntrySchemaType,
  SacemDeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration/sacem';
import { eventSerieNotFoundError, organizationCollaboratorRoleRequiredError } from '@ad/src/models/entities/errors';
import { prisma } from '@ad/src/prisma/client';
import {
  sacdDeclarationPrismaToModel,
  sacdPlaceholderDeclarationPrismaToModel,
  sacemDeclarationPrismaToModel,
  sacemPlaceholderDeclarationPrismaToModel,
} from '@ad/src/server/routers/mappers';
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
  getSacdDeclaration: privateProcedure.input(GetSacdDeclarationSchema).query(async ({ ctx, input }) => {
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
            EventSerieSacdDeclaration: {
              select: {
                id: true,
                clientId: true,
                officialHeadquartersId: true,
                productionOperationId: true,
                productionType: true,
                placeName: true,
                placePostalCode: true,
                placeCity: true,
                audience: true,
                placeCapacity: true,
                declarationPlace: true,
                organizer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phoneId: true,
                    officialHeadquartersId: true,
                    europeanVatId: true,
                    headquartersAddress: {
                      select: {
                        id: true,
                        street: true,
                        city: true,
                        postalCode: true,
                        countryCode: true,
                        subdivision: true,
                      },
                    },
                    phone: {
                      select: {
                        id: true,
                        callingCode: true,
                        countryCode: true,
                        number: true,
                      },
                    },
                  },
                },
                producer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phoneId: true,
                    officialHeadquartersId: true,
                    europeanVatId: true,
                    headquartersAddress: {
                      select: {
                        id: true,
                        street: true,
                        city: true,
                        postalCode: true,
                        countryCode: true,
                        subdivision: true,
                      },
                    },
                    phone: {
                      select: {
                        id: true,
                        callingCode: true,
                        countryCode: true,
                        number: true,
                      },
                    },
                  },
                },
                rightsFeesManager: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phoneId: true,
                    officialHeadquartersId: true,
                    europeanVatId: true,
                    headquartersAddress: {
                      select: {
                        id: true,
                        street: true,
                        city: true,
                        postalCode: true,
                        countryCode: true,
                        subdivision: true,
                      },
                    },
                    phone: {
                      select: {
                        id: true,
                        callingCode: true,
                        countryCode: true,
                        number: true,
                      },
                    },
                  },
                },
                SacdDeclarationAccountingEntry: {
                  select: {
                    category: true,
                    categoryPrecision: true,
                    taxRate: true,
                    amount: true,
                  },
                },
                SacdDeclarationPerformedWork: {
                  select: {
                    category: true,
                    name: true,
                    contributors: true,
                    durationSeconds: true,
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
    const previousDeclarations = await prisma.eventSerieSacdDeclaration.findMany({
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
        officialHeadquartersId: true,
        productionOperationId: true,
        productionType: true,
        placeName: true,
        placePostalCode: true,
        placeCity: true,
        audience: true,
        placeCapacity: true,
        declarationPlace: true,
        organizer: {
          select: {
            name: true,
            email: true,
            phoneId: true,
            officialHeadquartersId: true,
            europeanVatId: true,
            headquartersAddress: {
              select: {
                street: true,
                city: true,
                postalCode: true,
                countryCode: true,
                subdivision: true,
              },
            },
            phone: {
              select: {
                callingCode: true,
                countryCode: true,
                number: true,
              },
            },
          },
        },
        producer: {
          select: {
            name: true,
            email: true,
            phoneId: true,
            officialHeadquartersId: true,
            europeanVatId: true,
            headquartersAddress: {
              select: {
                street: true,
                city: true,
                postalCode: true,
                countryCode: true,
                subdivision: true,
              },
            },
            phone: {
              select: {
                callingCode: true,
                countryCode: true,
                number: true,
              },
            },
          },
        },
        rightsFeesManager: {
          select: {
            name: true,
            email: true,
            phoneId: true,
            officialHeadquartersId: true,
            europeanVatId: true,
            headquartersAddress: {
              select: {
                street: true,
                city: true,
                postalCode: true,
                countryCode: true,
                subdivision: true,
              },
            },
            phone: {
              select: {
                callingCode: true,
                countryCode: true,
                number: true,
              },
            },
          },
        },
        SacdDeclarationAccountingEntry: {
          select: {
            category: true,
            categoryPrecision: true,
            taxRate: true,
            amount: true,
          },
        },
        SacdDeclarationPerformedWork: {
          select: {
            category: true,
            name: true,
            contributors: true,
            durationSeconds: true,
          },
        },
      },
      distinct: [
        'clientId',
        'officialHeadquartersId',
        'productionOperationId',
        'productionType',
        'placeName',
        'placePostalCode',
        'placeCity',
        'audience',
        'placeCapacity',
        'declarationPlace',
      ], // At least the distinct may remove duplicates for the whole chain
      // Get only a few of the last declarations since it should representative
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    const { accountingEntries, ...computedPlaceholder } = sacdPlaceholderDeclarationPrismaToModel(eventSerie);

    const placeholder: SacdDeclarationWrapperSchemaType['placeholder'] = {
      ...computedPlaceholder,
      clientId: [],
      officialHeadquartersId: [],
      productionOperationId: [],
      productionType: SacdProductionTypeSchema.Values.PROFESSIONAL,
      placeName: [],
      placePostalCode: [],
      placeCity: [],
      audience: SacdAudienceSchema.Values.ALL,
      placeCapacity: [],
      declarationPlace: [],
      accountingEntries: ensureMinimumSacdAccountingItems(accountingEntries),
      performedWorks: [],
      organizer: {
        name: [],
        email: [],
        officialHeadquartersId: [],
        europeanVatId: [],
        headquartersAddress: {
          street: [],
          city: [],
          postalCode: [],
          countryCode: [],
          subdivision: [],
        },
        phone: {
          callingCode: [],
          countryCode: [],
          number: [],
        },
      },
      producer: {
        name: [],
        email: [],
        officialHeadquartersId: [],
        europeanVatId: [],
        headquartersAddress: {
          street: [],
          city: [],
          postalCode: [],
          countryCode: [],
          subdivision: [],
        },
        phone: {
          callingCode: [],
          countryCode: [],
          number: [],
        },
      },
      rightsFeesManager: {
        name: [],
        email: [],
        officialHeadquartersId: [],
        europeanVatId: [],
        headquartersAddress: {
          street: [],
          city: [],
          postalCode: [],
          countryCode: [],
          subdivision: [],
        },
        phone: {
          callingCode: [],
          countryCode: [],
          number: [],
        },
      },
      accountingEntriesOptions: {
        global: { taxRate: [], amount: [] },
        saleOfRights: { taxRate: [], amount: [] },
        introductionFees: { taxRate: [], amount: [] },
        coproductionContribution: { taxRate: [], amount: [] },
        revenueGuarantee: { taxRate: [], amount: [] },
        other: { taxRate: [], amount: [] },
        otherCategories: [],
      },
      performedWorksOptions: {
        category: [],
        name: [],
        contributors: [],
        durationSeconds: [],
      },
    };

    // Fill with unique values
    for (const previousDeclaration of previousDeclarations) {
      if (!placeholder.clientId.includes(previousDeclaration.clientId)) placeholder.clientId.push(previousDeclaration.clientId);
      if (!placeholder.officialHeadquartersId.includes(previousDeclaration.officialHeadquartersId))
        placeholder.officialHeadquartersId.push(previousDeclaration.officialHeadquartersId);
      if (!placeholder.productionOperationId.includes(previousDeclaration.productionOperationId))
        placeholder.productionOperationId.push(previousDeclaration.productionOperationId);
      if (!placeholder.placeName.includes(previousDeclaration.placeName)) placeholder.placeName.push(previousDeclaration.placeName);
      if (!placeholder.placePostalCode.includes(previousDeclaration.placePostalCode))
        placeholder.placePostalCode.push(previousDeclaration.placePostalCode);
      if (!placeholder.placeCity.includes(previousDeclaration.placeCity)) placeholder.placeCity.push(previousDeclaration.placeCity);
      if (!placeholder.placeCapacity.includes(previousDeclaration.placeCapacity)) placeholder.placeCapacity.push(previousDeclaration.placeCapacity);
      if (!placeholder.declarationPlace.includes(previousDeclaration.declarationPlace))
        placeholder.declarationPlace.push(previousDeclaration.declarationPlace);

      if (!placeholder.organizer.name.includes(previousDeclaration.organizer.name))
        placeholder.organizer.name.push(previousDeclaration.organizer.name);
      if (!placeholder.organizer.email.includes(previousDeclaration.organizer.email))
        placeholder.organizer.email.push(previousDeclaration.organizer.email);
      if (!placeholder.organizer.officialHeadquartersId.includes(previousDeclaration.organizer.officialHeadquartersId))
        placeholder.organizer.officialHeadquartersId.push(previousDeclaration.organizer.officialHeadquartersId);
      if (!placeholder.organizer.europeanVatId.includes(previousDeclaration.organizer.europeanVatId))
        placeholder.organizer.europeanVatId.push(previousDeclaration.organizer.europeanVatId);
      if (!placeholder.organizer.headquartersAddress.street.includes(previousDeclaration.organizer.headquartersAddress.street))
        placeholder.organizer.headquartersAddress.street.push(previousDeclaration.organizer.headquartersAddress.street);
      if (!placeholder.organizer.headquartersAddress.city.includes(previousDeclaration.organizer.headquartersAddress.city))
        placeholder.organizer.headquartersAddress.city.push(previousDeclaration.organizer.headquartersAddress.city);
      if (!placeholder.organizer.headquartersAddress.postalCode.includes(previousDeclaration.organizer.headquartersAddress.postalCode))
        placeholder.organizer.headquartersAddress.postalCode.push(previousDeclaration.organizer.headquartersAddress.postalCode);
      if (!placeholder.organizer.headquartersAddress.countryCode.includes(previousDeclaration.organizer.headquartersAddress.countryCode))
        placeholder.organizer.headquartersAddress.countryCode.push(previousDeclaration.organizer.headquartersAddress.countryCode);
      if (!placeholder.organizer.headquartersAddress.subdivision.includes(previousDeclaration.organizer.headquartersAddress.subdivision))
        placeholder.organizer.headquartersAddress.subdivision.push(previousDeclaration.organizer.headquartersAddress.subdivision);
      if (!placeholder.organizer.phone.callingCode.includes(previousDeclaration.organizer.phone.callingCode))
        placeholder.organizer.phone.callingCode.push(previousDeclaration.organizer.phone.callingCode);
      if (!placeholder.organizer.phone.countryCode.includes(previousDeclaration.organizer.phone.countryCode))
        placeholder.organizer.phone.countryCode.push(previousDeclaration.organizer.phone.countryCode);
      if (!placeholder.organizer.phone.number.includes(previousDeclaration.organizer.phone.number))
        placeholder.organizer.phone.number.push(previousDeclaration.organizer.phone.number);

      if (!placeholder.producer.name.includes(previousDeclaration.producer.name)) placeholder.producer.name.push(previousDeclaration.producer.name);
      if (!placeholder.producer.email.includes(previousDeclaration.producer.email))
        placeholder.producer.email.push(previousDeclaration.producer.email);
      if (!placeholder.producer.officialHeadquartersId.includes(previousDeclaration.producer.officialHeadquartersId))
        placeholder.producer.officialHeadquartersId.push(previousDeclaration.producer.officialHeadquartersId);
      if (!placeholder.producer.europeanVatId.includes(previousDeclaration.producer.europeanVatId))
        placeholder.producer.europeanVatId.push(previousDeclaration.producer.europeanVatId);
      if (!placeholder.producer.headquartersAddress.street.includes(previousDeclaration.producer.headquartersAddress.street))
        placeholder.producer.headquartersAddress.street.push(previousDeclaration.producer.headquartersAddress.street);
      if (!placeholder.producer.headquartersAddress.city.includes(previousDeclaration.producer.headquartersAddress.city))
        placeholder.producer.headquartersAddress.city.push(previousDeclaration.producer.headquartersAddress.city);
      if (!placeholder.producer.headquartersAddress.postalCode.includes(previousDeclaration.producer.headquartersAddress.postalCode))
        placeholder.producer.headquartersAddress.postalCode.push(previousDeclaration.producer.headquartersAddress.postalCode);
      if (!placeholder.producer.headquartersAddress.countryCode.includes(previousDeclaration.producer.headquartersAddress.countryCode))
        placeholder.producer.headquartersAddress.countryCode.push(previousDeclaration.producer.headquartersAddress.countryCode);
      if (!placeholder.producer.headquartersAddress.subdivision.includes(previousDeclaration.producer.headquartersAddress.subdivision))
        placeholder.producer.headquartersAddress.subdivision.push(previousDeclaration.producer.headquartersAddress.subdivision);
      if (!placeholder.producer.phone.callingCode.includes(previousDeclaration.producer.phone.callingCode))
        placeholder.producer.phone.callingCode.push(previousDeclaration.producer.phone.callingCode);
      if (!placeholder.producer.phone.countryCode.includes(previousDeclaration.producer.phone.countryCode))
        placeholder.producer.phone.countryCode.push(previousDeclaration.producer.phone.countryCode);
      if (!placeholder.producer.phone.number.includes(previousDeclaration.producer.phone.number))
        placeholder.producer.phone.number.push(previousDeclaration.producer.phone.number);

      if (!placeholder.rightsFeesManager.name.includes(previousDeclaration.rightsFeesManager.name))
        placeholder.rightsFeesManager.name.push(previousDeclaration.rightsFeesManager.name);
      if (!placeholder.rightsFeesManager.email.includes(previousDeclaration.rightsFeesManager.email))
        placeholder.rightsFeesManager.email.push(previousDeclaration.rightsFeesManager.email);
      if (!placeholder.rightsFeesManager.officialHeadquartersId.includes(previousDeclaration.rightsFeesManager.officialHeadquartersId))
        placeholder.rightsFeesManager.officialHeadquartersId.push(previousDeclaration.rightsFeesManager.officialHeadquartersId);
      if (!placeholder.rightsFeesManager.europeanVatId.includes(previousDeclaration.rightsFeesManager.europeanVatId))
        placeholder.rightsFeesManager.europeanVatId.push(previousDeclaration.rightsFeesManager.europeanVatId);
      if (!placeholder.rightsFeesManager.headquartersAddress.street.includes(previousDeclaration.rightsFeesManager.headquartersAddress.street))
        placeholder.rightsFeesManager.headquartersAddress.street.push(previousDeclaration.rightsFeesManager.headquartersAddress.street);
      if (!placeholder.rightsFeesManager.headquartersAddress.city.includes(previousDeclaration.rightsFeesManager.headquartersAddress.city))
        placeholder.rightsFeesManager.headquartersAddress.city.push(previousDeclaration.rightsFeesManager.headquartersAddress.city);
      if (
        !placeholder.rightsFeesManager.headquartersAddress.postalCode.includes(previousDeclaration.rightsFeesManager.headquartersAddress.postalCode)
      )
        placeholder.rightsFeesManager.headquartersAddress.postalCode.push(previousDeclaration.rightsFeesManager.headquartersAddress.postalCode);
      if (
        !placeholder.rightsFeesManager.headquartersAddress.countryCode.includes(previousDeclaration.rightsFeesManager.headquartersAddress.countryCode)
      )
        placeholder.rightsFeesManager.headquartersAddress.countryCode.push(previousDeclaration.rightsFeesManager.headquartersAddress.countryCode);
      if (
        !placeholder.rightsFeesManager.headquartersAddress.subdivision.includes(previousDeclaration.rightsFeesManager.headquartersAddress.subdivision)
      )
        placeholder.rightsFeesManager.headquartersAddress.subdivision.push(previousDeclaration.rightsFeesManager.headquartersAddress.subdivision);
      if (!placeholder.rightsFeesManager.phone.callingCode.includes(previousDeclaration.rightsFeesManager.phone.callingCode))
        placeholder.rightsFeesManager.phone.callingCode.push(previousDeclaration.rightsFeesManager.phone.callingCode);
      if (!placeholder.rightsFeesManager.phone.countryCode.includes(previousDeclaration.rightsFeesManager.phone.countryCode))
        placeholder.rightsFeesManager.phone.countryCode.push(previousDeclaration.rightsFeesManager.phone.countryCode);
      if (!placeholder.rightsFeesManager.phone.number.includes(previousDeclaration.rightsFeesManager.phone.number))
        placeholder.rightsFeesManager.phone.number.push(previousDeclaration.rightsFeesManager.phone.number);

      for (const accountingEntry of previousDeclaration.SacdDeclarationAccountingEntry) {
        // Amounts are specific to each series so there is no need of filling them as placeholders
        // TODO: we could reuse as placeholder entries for another declaration having the same accounting entry
        if (accountingEntry.taxRate !== null) {
          const taxRate = accountingEntry.taxRate.toNumber();

          switch (accountingEntry.category) {
            case 'GLOBAL':
              if (!placeholder.accountingEntriesOptions.global.taxRate.includes(taxRate))
                placeholder.accountingEntriesOptions.global.taxRate.push(taxRate);
              break;
            case 'SALE_OF_RIGHTS':
              if (!placeholder.accountingEntriesOptions.saleOfRights.taxRate.includes(taxRate))
                placeholder.accountingEntriesOptions.saleOfRights.taxRate.push(taxRate);
              break;
            case 'INTRODUCTION_FEES':
              if (!placeholder.accountingEntriesOptions.introductionFees.taxRate.includes(taxRate))
                placeholder.accountingEntriesOptions.introductionFees.taxRate.push(taxRate);
              break;
            case 'COPRODUCTION_CONTRIBUTION':
              if (!placeholder.accountingEntriesOptions.coproductionContribution.taxRate.includes(taxRate))
                placeholder.accountingEntriesOptions.coproductionContribution.taxRate.push(taxRate);
              break;
            case 'REVENUE_GUARANTEE':
              if (!placeholder.accountingEntriesOptions.revenueGuarantee.taxRate.includes(taxRate))
                placeholder.accountingEntriesOptions.revenueGuarantee.taxRate.push(taxRate);
              break;
            case 'OTHER':
              if (
                accountingEntry.categoryPrecision &&
                !placeholder.accountingEntriesOptions.otherCategories.includes(accountingEntry.categoryPrecision)
              )
                placeholder.accountingEntriesOptions.otherCategories.push(accountingEntry.categoryPrecision);
              if (!placeholder.accountingEntriesOptions.other.taxRate.includes(taxRate))
                placeholder.accountingEntriesOptions.other.taxRate.push(taxRate);
              break;
          }
        }
      }

      for (const performedWork of previousDeclaration.SacdDeclarationPerformedWork) {
        if (!placeholder.performedWorksOptions.category.includes(performedWork.category))
          placeholder.performedWorksOptions.category.push(performedWork.category);
        if (!placeholder.performedWorksOptions.name.includes(performedWork.name)) placeholder.performedWorksOptions.name.push(performedWork.name);
        if (!placeholder.performedWorksOptions.durationSeconds.includes(performedWork.durationSeconds))
          placeholder.performedWorksOptions.durationSeconds.push(performedWork.durationSeconds);

        for (const contributor of performedWork.contributors) {
          if (!placeholder.performedWorksOptions.contributors.includes(contributor)) placeholder.performedWorksOptions.contributors.push(contributor);
        }
      }
    }

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacdDeclaration !== null);

    // Note: the generated properties calculation is done 2 times but we are fine with that for now
    return {
      sacdDeclarationWrapper: {
        declaration: existingDeclaration ? sacdDeclarationPrismaToModel(eventSerie, existingDeclaration.EventSerieSacdDeclaration!) : null,
        placeholder: placeholder,
      } satisfies SacdDeclarationWrapperSchemaType,
    };
  }),
  fillSacdDeclaration: privateProcedure.input(FillSacdDeclarationSchema).mutation(async ({ ctx, input }) => {
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
            EventSerieSacdDeclaration: {
              select: {
                id: true,
                organizer: {
                  select: {
                    id: true,
                  },
                },
                producer: {
                  select: {
                    id: true,
                  },
                },
                rightsFeesManager: {
                  select: {
                    id: true,
                  },
                },
                SacdDeclarationAccountingEntry: {
                  select: {
                    id: true,
                    category: true,
                    categoryPrecision: true,
                    taxRate: true,
                    amount: true,
                  },
                },
                SacdDeclarationPerformedWork: {
                  select: {
                    id: true,
                    category: true,
                    name: true,
                    contributors: true,
                    durationSeconds: true,
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

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacdDeclaration !== null);

    const submittedLiteAccountingEntries = new Map<
      string, // It's a mix of multiple fields to make sure we have a unique key
      LiteSacdDeclarationAccountingEntrySchemaType
    >();

    for (const accountingEntry of input.accountingEntries) {
      submittedLiteAccountingEntries.set(`${accountingEntry.category}_${accountingEntry.categoryPrecision}`, {
        category: accountingEntry.category,
        categoryPrecision: accountingEntry.categoryPrecision,
        taxRate: accountingEntry.taxRate,
        includingTaxesAmount: accountingEntry.includingTaxesAmount,
      });
    }

    const submittedLitePerformedWorks = new Map<
      string, // It's a mix of multiple fields to make sure we have a unique key
      LiteSacdDeclarationPerformedWorkSchemaType
    >();

    for (const performedWork of input.performedWorks) {
      submittedLitePerformedWorks.set(`${performedWork.category}_${performedWork.name}`, {
        category: performedWork.category,
        name: performedWork.name,
        contributors: performedWork.contributors,
        durationSeconds: performedWork.durationSeconds,
      });
    }

    // We have to handle both update and creation since it's implicitely linked to an event serie
    // [WORKAROUND] `upsert` cannot be used to `where` not accepting undefined values (the zero UUID could be a bit at risk so using `create+update`)
    // Ref: https://github.com/prisma/prisma/issues/5233
    let sacdDeclaration;

    if (existingDeclaration) {
      assert(existingDeclaration.EventSerieSacdDeclaration);

      const sacdDeclarationId = existingDeclaration.EventSerieSacdDeclaration.id;

      const storedLiteAccountingEntries: typeof submittedLiteAccountingEntries = new Map();
      const storedLitePerformedWorks: typeof submittedLitePerformedWorks = new Map();

      for (const accountingEntry of existingDeclaration.EventSerieSacdDeclaration!.SacdDeclarationAccountingEntry) {
        storedLiteAccountingEntries.set(`${accountingEntry.category}_${accountingEntry.categoryPrecision}`, {
          category: accountingEntry.category,
          categoryPrecision: accountingEntry.categoryPrecision,
          taxRate: accountingEntry.taxRate !== null ? accountingEntry.taxRate.toNumber() : null,
          includingTaxesAmount: accountingEntry.amount.toNumber(),
        });
      }

      for (const performedWork of existingDeclaration.EventSerieSacdDeclaration!.SacdDeclarationPerformedWork) {
        storedLitePerformedWorks.set(`${performedWork.category}_${performedWork.name}`, {
          category: performedWork.category,
          name: performedWork.name,
          contributors: performedWork.contributors,
          durationSeconds: performedWork.durationSeconds,
        });
      }

      const accountingEntriesDiffResult = getDiff(storedLiteAccountingEntries, submittedLiteAccountingEntries);
      const performedWorksDiffResult = getDiff(storedLitePerformedWorks, submittedLitePerformedWorks);

      // We want to compare declaration organizations to avoid duplicating data in the database
      // Note: we consider the organizer object the base for reference so the association won't change for simplicity
      const organizerProducerDiff = diff(input.organizer, input.producer);
      const producerRightsFeesManagerDiff = diff(input.producer, input.rightsFeesManager);
      const organizerRightsFeesManagerDiff = diff(input.organizer, input.rightsFeesManager);

      const organizerId = existingDeclaration.EventSerieSacdDeclaration.organizer.id;

      let producerId: string;
      if (organizerProducerDiff.length === 0) {
        producerId = organizerId;
      } else {
        const producer = await prisma.sacdDeclarationOrganization.create({
          data: {
            name: input.producer.name,
            email: input.producer.email,
            officialHeadquartersId: input.producer.officialHeadquartersId,
            europeanVatId: input.producer.europeanVatId,
            headquartersAddress: {
              create: {
                street: input.producer.headquartersAddress.street,
                city: input.producer.headquartersAddress.city,
                postalCode: input.producer.headquartersAddress.postalCode,
                countryCode: input.producer.headquartersAddress.countryCode,
                subdivision: input.producer.headquartersAddress.subdivision,
              },
            },
            phone: {
              create: {
                phoneType: PhoneType.UNSPECIFIED,
                callingCode: input.producer.phone.callingCode,
                countryCode: input.producer.phone.countryCode,
                number: input.producer.phone.number,
              },
            },
          },
        });

        producerId = producer.id;
      }

      let rightsFeesManagerId: string;
      if (organizerRightsFeesManagerDiff.length === 0) {
        rightsFeesManagerId = organizerId;
      } else if (producerRightsFeesManagerDiff.length === 0) {
        rightsFeesManagerId = producerId;
      } else {
        const rightsFeesManager = await prisma.sacdDeclarationOrganization.create({
          data: {
            name: input.rightsFeesManager.name,
            email: input.rightsFeesManager.email,
            officialHeadquartersId: input.rightsFeesManager.officialHeadquartersId,
            europeanVatId: input.rightsFeesManager.europeanVatId,
            headquartersAddress: {
              create: {
                street: input.rightsFeesManager.headquartersAddress.street,
                city: input.rightsFeesManager.headquartersAddress.city,
                postalCode: input.rightsFeesManager.headquartersAddress.postalCode,
                countryCode: input.rightsFeesManager.headquartersAddress.countryCode,
                subdivision: input.rightsFeesManager.headquartersAddress.subdivision,
              },
            },
            phone: {
              create: {
                phoneType: PhoneType.UNSPECIFIED,
                callingCode: input.rightsFeesManager.phone.callingCode,
                countryCode: input.rightsFeesManager.phone.countryCode,
                number: input.rightsFeesManager.phone.number,
              },
            },
          },
        });

        rightsFeesManagerId = rightsFeesManager.id;
      }

      // Nullable field cannot be used as part of the unique compound... so we need to perform association mutations without unique constraints
      // Ref: https://github.com/prisma/prisma/issues/3197
      sacdDeclaration = await prisma.eventSerieSacdDeclaration.update({
        where: {
          id: sacdDeclarationId,
        },
        data: {
          clientId: input.clientId,
          officialHeadquartersId: input.officialHeadquartersId,
          productionOperationId: input.productionOperationId,
          productionType: input.productionType,
          placeName: input.placeName,
          placePostalCode: input.placePostalCode,
          placeCity: input.placeCity,
          audience: input.audience,
          placeCapacity: input.placeCapacity,
          declarationPlace: input.declarationPlace,
          organizer: {
            update: {
              name: input.organizer.name,
              email: input.organizer.email,
              officialHeadquartersId: input.organizer.officialHeadquartersId,
              europeanVatId: input.organizer.europeanVatId,
              headquartersAddress: {
                update: {
                  street: input.organizer.headquartersAddress.street,
                  city: input.organizer.headquartersAddress.city,
                  postalCode: input.organizer.headquartersAddress.postalCode,
                  countryCode: input.organizer.headquartersAddress.countryCode,
                  subdivision: input.organizer.headquartersAddress.subdivision,
                },
              },
              phone: {
                update: {
                  phoneType: PhoneType.UNSPECIFIED,
                  callingCode: input.organizer.phone.callingCode,
                  countryCode: input.organizer.phone.countryCode,
                  number: input.organizer.phone.number,
                },
              },
            },
          },
          producer: {
            connect: {
              id: producerId,
            },
          },
          rightsFeesManager: {
            connect: {
              id: rightsFeesManagerId,
            },
          },
          SacdDeclarationAccountingEntry: {
            deleteMany: accountingEntriesDiffResult.removed.map((removedEntry) => {
              return {
                sacdDeclarationId: sacdDeclarationId,
                category: removedEntry.category,
                categoryPrecision: removedEntry.categoryPrecision,
              } satisfies Prisma.SacdDeclarationAccountingEntryScalarWhereInput;
            }),
            create: accountingEntriesDiffResult.added.map((addedEntry) => {
              return {
                category: addedEntry.category,
                categoryPrecision: addedEntry.categoryPrecision,
                taxRate: addedEntry.taxRate,
                amount: addedEntry.includingTaxesAmount,
              } satisfies Prisma.SacdDeclarationAccountingEntryCreateWithoutSacdDeclarationInput;
            }),
            updateMany: accountingEntriesDiffResult.updated.map((updatedEntry) => {
              return {
                where: {
                  sacdDeclarationId: sacdDeclarationId,
                  category: updatedEntry.category,
                  categoryPrecision: updatedEntry.categoryPrecision,
                },
                data: {
                  taxRate: updatedEntry.taxRate,
                  amount: updatedEntry.includingTaxesAmount,
                },
              } satisfies Prisma.SacdDeclarationAccountingEntryUpdateManyWithWhereWithoutSacdDeclarationInput;
            }),
          },
          SacdDeclarationPerformedWork: {
            deleteMany: performedWorksDiffResult.removed.map((removedPerformedWork) => {
              return {
                sacdDeclarationId: sacdDeclarationId,
                category: removedPerformedWork.category,
                name: removedPerformedWork.name,
              } satisfies Prisma.SacdDeclarationPerformedWorkScalarWhereInput;
            }),
            create: performedWorksDiffResult.added.map((addedPerformedWork) => {
              return {
                category: addedPerformedWork.category,
                name: addedPerformedWork.name,
                contributors: addedPerformedWork.contributors,
                durationSeconds: addedPerformedWork.durationSeconds,
              } satisfies Prisma.SacdDeclarationPerformedWorkCreateWithoutSacdDeclarationInput;
            }),
            updateMany: performedWorksDiffResult.updated.map((updatedPerformedWork) => {
              return {
                where: {
                  sacdDeclarationId: sacdDeclarationId,
                  category: updatedPerformedWork.category,
                  name: updatedPerformedWork.name,
                },
                data: {
                  contributors: updatedPerformedWork.contributors,
                  durationSeconds: updatedPerformedWork.durationSeconds,
                },
              } satisfies Prisma.SacdDeclarationPerformedWorkUpdateManyWithWhereWithoutSacdDeclarationInput;
            }),
          },
        },
        select: {
          id: true,
          clientId: true,
          officialHeadquartersId: true,
          productionOperationId: true,
          productionType: true,
          placeName: true,
          placePostalCode: true,
          placeCity: true,
          audience: true,
          placeCapacity: true,
          declarationPlace: true,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneId: true,
              officialHeadquartersId: true,
              europeanVatId: true,
              headquartersAddress: {
                select: {
                  id: true,
                  street: true,
                  city: true,
                  postalCode: true,
                  countryCode: true,
                  subdivision: true,
                },
              },
              phone: {
                select: {
                  id: true,
                  callingCode: true,
                  countryCode: true,
                  number: true,
                },
              },
            },
          },
          producer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneId: true,
              officialHeadquartersId: true,
              europeanVatId: true,
              headquartersAddress: {
                select: {
                  id: true,
                  street: true,
                  city: true,
                  postalCode: true,
                  countryCode: true,
                  subdivision: true,
                },
              },
              phone: {
                select: {
                  id: true,
                  callingCode: true,
                  countryCode: true,
                  number: true,
                },
              },
            },
          },
          rightsFeesManager: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneId: true,
              officialHeadquartersId: true,
              europeanVatId: true,
              headquartersAddress: {
                select: {
                  id: true,
                  street: true,
                  city: true,
                  postalCode: true,
                  countryCode: true,
                  subdivision: true,
                },
              },
              phone: {
                select: {
                  id: true,
                  callingCode: true,
                  countryCode: true,
                  number: true,
                },
              },
            },
          },
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
          SacdDeclarationAccountingEntry: {
            select: {
              category: true,
              categoryPrecision: true,
              taxRate: true,
              amount: true,
            },
          },
          SacdDeclarationPerformedWork: {
            select: {
              category: true,
              name: true,
              contributors: true,
              durationSeconds: true,
            },
          },
        },
      });

      // Delete old objects to avoid orphans
      // Notes:
      // - We make sure it's not used by another one
      // - They must be deleted once the declaration has been updated to not have remaining foreign key
      if (
        producerId !== existingDeclaration.EventSerieSacdDeclaration.producer.id &&
        existingDeclaration.EventSerieSacdDeclaration.producer.id !== organizerId
      ) {
        await prisma.sacdDeclarationOrganization.delete({ where: { id: existingDeclaration.EventSerieSacdDeclaration.producer.id } });
      }

      if (
        rightsFeesManagerId !== existingDeclaration.EventSerieSacdDeclaration.rightsFeesManager.id &&
        existingDeclaration.EventSerieSacdDeclaration.rightsFeesManager.id !== organizerId &&
        existingDeclaration.EventSerieSacdDeclaration.rightsFeesManager.id !== producerId &&
        // Also make sure it has not been deleted by the previous condition
        existingDeclaration.EventSerieSacdDeclaration.rightsFeesManager.id !== existingDeclaration.EventSerieSacdDeclaration.producer.id
      ) {
        await prisma.sacdDeclarationOrganization.delete({ where: { id: existingDeclaration.EventSerieSacdDeclaration.rightsFeesManager.id } });
      }
    } else {
      // We want to compare declaration organizations to avoid duplicating data in the database
      const organizerProducerDiff = diff(input.organizer, input.producer);
      const producerRightsFeesManagerDiff = diff(input.producer, input.rightsFeesManager);
      const organizerRightsFeesManagerDiff = diff(input.organizer, input.rightsFeesManager);

      const organizer = await prisma.sacdDeclarationOrganization.create({
        data: {
          name: input.organizer.name,
          email: input.organizer.email,
          officialHeadquartersId: input.organizer.officialHeadquartersId,
          europeanVatId: input.organizer.europeanVatId,
          headquartersAddress: {
            create: {
              street: input.organizer.headquartersAddress.street,
              city: input.organizer.headquartersAddress.city,
              postalCode: input.organizer.headquartersAddress.postalCode,
              countryCode: input.organizer.headquartersAddress.countryCode,
              subdivision: input.organizer.headquartersAddress.subdivision,
            },
          },
          phone: {
            create: {
              phoneType: PhoneType.UNSPECIFIED,
              callingCode: input.organizer.phone.callingCode,
              countryCode: input.organizer.phone.countryCode,
              number: input.organizer.phone.number,
            },
          },
        },
      });

      let producerId: string;
      if (organizerProducerDiff.length === 0) {
        producerId = organizer.id;
      } else {
        const producer = await prisma.sacdDeclarationOrganization.create({
          data: {
            name: input.producer.name,
            email: input.producer.email,
            officialHeadquartersId: input.producer.officialHeadquartersId,
            europeanVatId: input.producer.europeanVatId,
            headquartersAddress: {
              create: {
                street: input.producer.headquartersAddress.street,
                city: input.producer.headquartersAddress.city,
                postalCode: input.producer.headquartersAddress.postalCode,
                countryCode: input.producer.headquartersAddress.countryCode,
                subdivision: input.producer.headquartersAddress.subdivision,
              },
            },
            phone: {
              create: {
                phoneType: PhoneType.UNSPECIFIED,
                callingCode: input.producer.phone.callingCode,
                countryCode: input.producer.phone.countryCode,
                number: input.producer.phone.number,
              },
            },
          },
        });

        producerId = producer.id;
      }

      let rightsFeesManagerId: string;
      if (organizerRightsFeesManagerDiff.length === 0) {
        rightsFeesManagerId = organizer.id;
      } else if (producerRightsFeesManagerDiff.length === 0) {
        rightsFeesManagerId = producerId;
      } else {
        const rightsFeesManager = await prisma.sacdDeclarationOrganization.create({
          data: {
            name: input.rightsFeesManager.name,
            email: input.rightsFeesManager.email,
            officialHeadquartersId: input.rightsFeesManager.officialHeadquartersId,
            europeanVatId: input.rightsFeesManager.europeanVatId,
            headquartersAddress: {
              create: {
                street: input.rightsFeesManager.headquartersAddress.street,
                city: input.rightsFeesManager.headquartersAddress.city,
                postalCode: input.rightsFeesManager.headquartersAddress.postalCode,
                countryCode: input.rightsFeesManager.headquartersAddress.countryCode,
                subdivision: input.rightsFeesManager.headquartersAddress.subdivision,
              },
            },
            phone: {
              create: {
                phoneType: PhoneType.UNSPECIFIED,
                callingCode: input.rightsFeesManager.phone.callingCode,
                countryCode: input.rightsFeesManager.phone.countryCode,
                number: input.rightsFeesManager.phone.number,
              },
            },
          },
        });

        rightsFeesManagerId = rightsFeesManager.id;
      }

      sacdDeclaration = await prisma.eventSerieSacdDeclaration.create({
        data: {
          clientId: input.clientId,
          officialHeadquartersId: input.officialHeadquartersId,
          productionOperationId: input.productionOperationId,
          productionType: input.productionType,
          placeName: input.placeName,
          placePostalCode: input.placePostalCode,
          placeCity: input.placeCity,
          audience: input.audience,
          placeCapacity: input.placeCapacity,
          declarationPlace: input.declarationPlace,
          organizer: {
            connect: {
              id: organizer.id,
            },
          },
          producer: {
            connect: {
              id: producerId,
            },
          },
          rightsFeesManager: {
            connect: {
              id: rightsFeesManagerId,
            },
          },
          eventSerieDeclaration: {
            create: {
              status: EventSerieDeclarationStatus.PENDING,
              eventSerieId: eventSerie.id,
            },
          },
          SacdDeclarationAccountingEntry: {
            create: Array.from(submittedLiteAccountingEntries).map(([_, entry]) => {
              return {
                category: entry.category,
                categoryPrecision: entry.categoryPrecision,
                taxRate: entry.taxRate,
                amount: entry.includingTaxesAmount,
              };
            }),
          },
          SacdDeclarationPerformedWork: {
            create: Array.from(submittedLitePerformedWorks).map(([_, performedWork]) => {
              return {
                category: performedWork.category,
                name: performedWork.name,
                contributors: performedWork.contributors,
                durationSeconds: performedWork.durationSeconds,
              };
            }),
          },
        },
        select: {
          id: true,
          clientId: true,
          officialHeadquartersId: true,
          productionOperationId: true,
          productionType: true,
          placeName: true,
          placePostalCode: true,
          placeCity: true,
          audience: true,
          placeCapacity: true,
          declarationPlace: true,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneId: true,
              officialHeadquartersId: true,
              europeanVatId: true,
              headquartersAddress: {
                select: {
                  id: true,
                  street: true,
                  city: true,
                  postalCode: true,
                  countryCode: true,
                  subdivision: true,
                },
              },
              phone: {
                select: {
                  id: true,
                  callingCode: true,
                  countryCode: true,
                  number: true,
                },
              },
            },
          },
          producer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneId: true,
              officialHeadquartersId: true,
              europeanVatId: true,
              headquartersAddress: {
                select: {
                  id: true,
                  street: true,
                  city: true,
                  postalCode: true,
                  countryCode: true,
                  subdivision: true,
                },
              },
              phone: {
                select: {
                  id: true,
                  callingCode: true,
                  countryCode: true,
                  number: true,
                },
              },
            },
          },
          rightsFeesManager: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneId: true,
              officialHeadquartersId: true,
              europeanVatId: true,
              headquartersAddress: {
                select: {
                  id: true,
                  street: true,
                  city: true,
                  postalCode: true,
                  countryCode: true,
                  subdivision: true,
                },
              },
              phone: {
                select: {
                  id: true,
                  callingCode: true,
                  countryCode: true,
                  number: true,
                },
              },
            },
          },
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
          SacdDeclarationAccountingEntry: {
            select: {
              category: true,
              categoryPrecision: true,
              taxRate: true,
              amount: true,
            },
          },
          SacdDeclarationPerformedWork: {
            select: {
              category: true,
              name: true,
              contributors: true,
              durationSeconds: true,
            },
          },
        },
      });
    }

    return {
      sacdDeclaration: sacdDeclarationPrismaToModel(sacdDeclaration.eventSerieDeclaration.eventSerie, sacdDeclaration),
    };
  }),
});
