import { EventSerieDeclarationStatus, Prisma } from '@prisma/client';
import { renderToBuffer } from '@react-pdf/renderer';
import slugify from '@sindresorhus/slugify';
import { z } from 'zod';

import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { ensureMinimumSacdAccountingItems, ensureMinimumSacemExpenseItems, ensureMinimumSacemRevenueItems } from '@ad/src/core/declaration';
import { getSacdClient } from '@ad/src/core/declaration/sacd';
import { Attachment as EmailAttachment, mailer } from '@ad/src/emails/mailer';
import {
  FillSacdDeclarationSchema,
  FillSacemDeclarationSchema,
  GetSacdDeclarationSchema,
  GetSacemDeclarationSchema,
  TransmitDeclarationSchema,
} from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { LiteSacdDeclarationAccountingEntrySchemaType, SacdDeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/sacd';
import {
  AccountingCategorySchema,
  AccountingFluxSchema,
  LiteSacemDeclarationAccountingEntrySchemaType,
  SacemDeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration/sacem';
import {
  BusinessError,
  eventSerieNotFoundError,
  organizationCollaboratorRoleRequiredError,
  sacemAgencyNotFoundError,
  sacemDeclarationUnsuccessfulError,
  transmittedDeclarationCannotBeUpdatedError,
} from '@ad/src/models/entities/errors';
import { EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { prisma } from '@ad/src/prisma/client';
import {
  eventCategoryTicketsPrismaToModel,
  eventPrismaToModel,
  eventSeriePrismaToModel,
  sacdDeclarationPrismaToModel,
  sacdPlaceholderDeclarationPrismaToModel,
  sacemDeclarationPrismaToModel,
  sacemPlaceholderDeclarationPrismaToModel,
  ticketCategoryPrismaToModel,
} from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { getDiff, sortDiffWithKeys } from '@ad/src/utils/comparaison';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export const declarationRouter = router({
  transmitDeclaration: privateProcedure.input(TransmitDeclarationSchema).mutation(async ({ ctx, input }) => {
    if (!['SACEM', 'SACD'].includes(input.type)) {
      throw new Error(`cannot transmit declaration of this type`);
    }

    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
      },
      select: {
        id: true,
        internalTicketingSystemId: true,
        ticketingSystemId: true,
        name: true,
        startAt: true,
        endAt: true,
        taxRate: true,
        createdAt: true,
        updatedAt: true,
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
            transmittedAt: true,
            EventSerieSacemDeclaration: {
              // Cannot use `input.type === DeclarationTypeSchema.Values.SACEM` otherwise result type is incomplete
              select: {
                id: true,
                clientId: true,
                placeName: true,
                placeCapacity: true,
                placePostalCode: true,
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
            EventSerieSacdDeclaration: {
              // Cannot use `input.type === DeclarationTypeSchema.Values.SACD` otherwise result type is incomplete
              select: {
                id: true,
                clientId: true,
                placeName: true,
                placeStreet: true,
                placePostalCode: true,
                placeCity: true,
                producer: {
                  select: {
                    id: true,
                    name: true,
                    officialHeadquartersId: true,
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
              },
            },
          },
        },
        Event: {
          select: {
            id: true,
            eventSerieId: true,
            internalTicketingSystemId: true,
            startAt: true,
            endAt: true,
            createdAt: true,
            updatedAt: true,
            EventCategoryTickets: {
              select: {
                id: true,
                eventId: true,
                categoryId: true,
                total: true,
                totalOverride: true,
                priceOverride: true,
                createdAt: true,
                updatedAt: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!eventSerie) {
      throw eventSerieNotFoundError;
    }

    // Before processing the declaration, make sure the caller has rights on this authority ;)
    if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    const originatorUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.user.id,
      },
    });

    const eventSerieModel = eventSeriePrismaToModel(eventSerie);
    const wrappersModel = eventSerie.Event.map((event): EventWrapperSchemaType => {
      return {
        event: eventPrismaToModel(event),
        sales: event.EventCategoryTickets.map((eventCategoryTickets) => {
          return {
            ticketCategory: ticketCategoryPrismaToModel(eventCategoryTickets.category),
            eventCategoryTickets: eventCategoryTicketsPrismaToModel(eventCategoryTickets),
          };
        }),
      };
    });

    let declarationId: string | null = null;

    try {
      switch (input.type) {
        case 'SACEM':
          const sacemDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

          if (!sacemDeclaration) {
            throw new Error(`no sacem declaration exists for this event serie`);
          }

          declarationId = sacemDeclaration.id;

          const sacemDeclarationModel = sacemDeclarationPrismaToModel(eventSerie, {
            ...sacemDeclaration.EventSerieSacemDeclaration!,
            transmittedAt: sacemDeclaration.transmittedAt,
          });

          const eventPlacePostalCode: string = sacemDeclarationModel.placePostalCode;

          const sacemAgency = await prisma.sacemAgency.findFirst({
            where: {
              matchingFrenchPostalCodes: {
                has: eventPlacePostalCode,
              },
            },
            select: {
              email: true,
            },
          });

          if (!sacemAgency) {
            throw sacemAgencyNotFoundError;
          }

          // We generate a PDF so the SACEM can deal with it easily (instead of setting the whole into the email text)
          const jsxDocument = SacemDeclarationDocument({
            sacemDeclaration: sacemDeclarationModel,
            signatory: `${originatorUser.firstname} ${originatorUser.lastname}`,
          });

          const declarationPdfBuffer = await renderToBuffer(jsxDocument);

          const declarationAttachment: EmailAttachment = {
            contentType: 'application/pdf',
            filename: `Déclaration SACEM - ${slugify(eventSerie.name)}.pdf`,
            content: declarationPdfBuffer,
            inline: false, // It will be attached, not specifically set somewhere in the content
          };

          try {
            await mailer.sendDeclarationToSacemAgency({
              recipient: sacemAgency.email,
              replyTo: originatorUser.email, // We give the SACEM the possibility to directly converse with the declarer
              eventSerieName: eventSerieModel.name,
              originatorFirstname: originatorUser.firstname,
              originatorLastname: originatorUser.lastname,
              originatorEmail: originatorUser.email,
              organizationName: eventSerie.ticketingSystem.organization.name,
              aboutUrl: linkRegistry.get('about', undefined, { absolute: true }),
              attachments: [declarationAttachment],
            });
          } catch (error) {
            console.error(error);

            throw sacemDeclarationUnsuccessfulError;
          }

          break;
        case 'SACD':
          const sacdDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacdDeclaration !== null);

          if (!sacdDeclaration) {
            throw new Error(`no sacd declaration exists for this event serie`);
          }

          declarationId = sacdDeclaration.id;

          const sacdDeclarationModel = sacdDeclarationPrismaToModel(eventSerie, {
            ...sacdDeclaration.EventSerieSacdDeclaration!,
            transmittedAt: sacdDeclaration.transmittedAt,
          });

          const sacdClient = getSacdClient(ctx.user.id);

          // Since not tracking token expiration we log in again (but we could improve that)
          await sacdClient.login();

          await sacdClient.declare(sacdDeclarationModel.clientId, eventSerieModel, wrappersModel, sacdDeclarationModel);

          break;
        default:
          throw new Error('declaration type to transmit not supported');
      }

      assert(declarationId);

      // If successful mark the declaration as transmitted
      await prisma.eventSerieDeclaration.update({
        where: {
          id: declarationId,
        },
        data: {
          status: EventSerieDeclarationStatus.PROCESSED,
          transmittedAt: new Date(),
          lastTransmissionError: null,
          lastTransmissionErrorAt: null,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (declarationId) {
          // Keep track of errors to help debugging
          await prisma.eventSerieDeclaration.update({
            where: {
              id: declarationId,
            },
            data: {
              lastTransmissionError: error instanceof BusinessError ? error.code : error.message,
              lastTransmissionErrorAt: new Date(),
            },
          });
        }
      }

      throw error;
    }

    return undefined;
  }),
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
            transmittedAt: true,
            EventSerieSacemDeclaration: {
              select: {
                id: true,
                clientId: true,
                placeName: true,
                placeCapacity: true,
                placePostalCode: true,
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
        placePostalCode: true,
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
      distinct: ['clientId', 'placeName', 'placeCapacity', 'placePostalCode', 'managerName', 'managerTitle', 'performanceType', 'declarationPlace'], // At least the distinct may remove duplicates for the whole chain
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
      placePostalCode: [],
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
      if (!placeholder.placePostalCode.includes(previousDeclaration.placePostalCode))
        placeholder.placePostalCode.push(previousDeclaration.placePostalCode);
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
        declaration: existingDeclaration
          ? sacemDeclarationPrismaToModel(eventSerie, {
              ...existingDeclaration.EventSerieSacemDeclaration!,
              transmittedAt: existingDeclaration.transmittedAt,
            })
          : null,
        placeholder: placeholder,
      } satisfies SacemDeclarationWrapperSchemaType,
    };
  }),
  sayHello: privateProcedure
    .meta({ openapi: { method: 'POST', path: '/say-hello/{name}', tags: ['partner'] } })
    .input(z.object({ name: z.string(), greeting: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .mutation(({ input }) => {
      return { greeting: `${input.greeting} ${input.name}!` };
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
            transmittedAt: true,
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
      if (existingDeclaration.transmittedAt) {
        throw transmittedDeclarationCannotBeUpdatedError;
      }

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
      const sortedAccountingEntriesDiffResult = sortDiffWithKeys(accountingEntriesDiffResult);

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
          placePostalCode: input.placePostalCode,
          managerName: input.managerName,
          managerTitle: input.managerTitle,
          performanceType: input.performanceType,
          declarationPlace: input.declarationPlace,
          SacemDeclarationAccountingEntry: {
            deleteMany: sortedAccountingEntriesDiffResult.removed.map((removedEntry) => {
              return {
                sacemDeclarationId: sacemDeclarationId,
                flux: removedEntry.model.flux,
                category: removedEntry.model.category,
                categoryPrecision: removedEntry.model.categoryPrecision,
              } satisfies Prisma.SacemDeclarationAccountingEntryScalarWhereInput;
            }),
            create: sortedAccountingEntriesDiffResult.added.map((addedEntry) => {
              return {
                flux: addedEntry.model.flux,
                category: addedEntry.model.category,
                categoryPrecision: addedEntry.model.categoryPrecision,
                taxRate: addedEntry.model.taxRate,
                amount: addedEntry.model.includingTaxesAmount,
              } satisfies Prisma.SacemDeclarationAccountingEntryCreateWithoutSacemDeclarationInput;
            }),
            updateMany: sortedAccountingEntriesDiffResult.updated.map((updatedEntry) => {
              return {
                where: {
                  sacemDeclarationId: sacemDeclarationId,
                  flux: updatedEntry.model.flux,
                  category: updatedEntry.model.category,
                  categoryPrecision: updatedEntry.model.categoryPrecision,
                },
                data: {
                  taxRate: updatedEntry.model.taxRate,
                  amount: updatedEntry.model.includingTaxesAmount,
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
          placePostalCode: true,
          managerName: true,
          managerTitle: true,
          performanceType: true,
          declarationPlace: true,
          eventSerieDeclaration: {
            select: {
              id: true,
              transmittedAt: true,
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
          placePostalCode: input.placePostalCode,
          managerName: input.managerName,
          managerTitle: input.managerTitle,
          performanceType: input.performanceType,
          declarationPlace: input.declarationPlace,
          eventSerieDeclaration: {
            create: {
              status: EventSerieDeclarationStatus.PENDING,
              eventSerieId: eventSerie.id,
              transmittedAt: null,
              lastTransmissionError: null,
              lastTransmissionErrorAt: null,
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
          placePostalCode: true,
          managerName: true,
          managerTitle: true,
          performanceType: true,
          declarationPlace: true,
          eventSerieDeclaration: {
            select: {
              id: true,
              transmittedAt: true,
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
      sacemDeclaration: sacemDeclarationPrismaToModel(sacemDeclaration.eventSerieDeclaration.eventSerie, {
        ...sacemDeclaration,
        transmittedAt: sacemDeclaration.eventSerieDeclaration.transmittedAt,
      }),
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
            transmittedAt: true,
            EventSerieSacdDeclaration: {
              select: {
                id: true,
                clientId: true,
                placeName: true,
                placeStreet: true,
                placePostalCode: true,
                placeCity: true,
                producer: {
                  select: {
                    id: true,
                    name: true,
                    officialHeadquartersId: true,
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
        placeName: true,
        placeStreet: true,
        placePostalCode: true,
        placeCity: true,
        producer: {
          select: {
            name: true,
            officialHeadquartersId: true,
            headquartersAddress: {
              select: {
                street: true,
                city: true,
                postalCode: true,
                countryCode: true,
                subdivision: true,
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
      },
      distinct: ['clientId', 'placeName', 'placeStreet', 'placePostalCode', 'placeCity'], // At least the distinct may remove duplicates for the whole chain
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
      placeName: [],
      placeStreet: [],
      placePostalCode: [],
      placeCity: [],
      accountingEntries: ensureMinimumSacdAccountingItems(accountingEntries),
      producer: {
        name: [],
        officialHeadquartersId: [],
        headquartersAddress: {
          street: [],
          city: [],
          postalCode: [],
          countryCode: [],
          subdivision: [],
        },
      },
      accountingEntriesOptions: {
        saleOfRights: { taxRate: [], amount: [] },
        introductionFees: { taxRate: [], amount: [] },
        coproductionContribution: { taxRate: [], amount: [] },
        revenueGuarantee: { taxRate: [], amount: [] },
        other: { taxRate: [], amount: [] },
        otherCategories: [],
      },
    };

    // Fill with unique values
    for (const previousDeclaration of previousDeclarations) {
      if (!placeholder.clientId.includes(previousDeclaration.clientId)) placeholder.clientId.push(previousDeclaration.clientId);
      if (!placeholder.placeName.includes(previousDeclaration.placeName)) placeholder.placeName.push(previousDeclaration.placeName);
      if (!placeholder.placeStreet.includes(previousDeclaration.placeStreet)) placeholder.placeStreet.push(previousDeclaration.placeStreet);
      if (!placeholder.placePostalCode.includes(previousDeclaration.placePostalCode))
        placeholder.placePostalCode.push(previousDeclaration.placePostalCode);
      if (!placeholder.placeCity.includes(previousDeclaration.placeCity)) placeholder.placeCity.push(previousDeclaration.placeCity);

      if (!placeholder.producer.name.includes(previousDeclaration.producer.name)) placeholder.producer.name.push(previousDeclaration.producer.name);
      if (!placeholder.producer.officialHeadquartersId.includes(previousDeclaration.producer.officialHeadquartersId))
        placeholder.producer.officialHeadquartersId.push(previousDeclaration.producer.officialHeadquartersId);
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

      for (const accountingEntry of previousDeclaration.SacdDeclarationAccountingEntry) {
        // Amounts are specific to each series so there is no need of filling them as placeholders
        // TODO: we could reuse as placeholder entries for another declaration having the same accounting entry
        if (accountingEntry.taxRate !== null) {
          const taxRate = accountingEntry.taxRate.toNumber();

          switch (accountingEntry.category) {
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
    }

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacdDeclaration !== null);

    // Note: the generated properties calculation is done 2 times but we are fine with that for now
    return {
      sacdDeclarationWrapper: {
        declaration: existingDeclaration
          ? sacdDeclarationPrismaToModel(eventSerie, {
              ...existingDeclaration.EventSerieSacdDeclaration!,
              transmittedAt: existingDeclaration.transmittedAt,
            })
          : null,
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
            transmittedAt: true,
            EventSerieSacdDeclaration: {
              select: {
                id: true,
                producer: {
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

    // We have to handle both update and creation since it's implicitely linked to an event serie
    // [WORKAROUND] `upsert` cannot be used to `where` not accepting undefined values (the zero UUID could be a bit at risk so using `create+update`)
    // Ref: https://github.com/prisma/prisma/issues/5233
    let sacdDeclaration;

    if (existingDeclaration) {
      if (existingDeclaration.transmittedAt) {
        throw transmittedDeclarationCannotBeUpdatedError;
      }

      assert(existingDeclaration.EventSerieSacdDeclaration);

      const sacdDeclarationId = existingDeclaration.EventSerieSacdDeclaration.id;

      const storedLiteAccountingEntries: typeof submittedLiteAccountingEntries = new Map();

      for (const accountingEntry of existingDeclaration.EventSerieSacdDeclaration!.SacdDeclarationAccountingEntry) {
        storedLiteAccountingEntries.set(`${accountingEntry.category}_${accountingEntry.categoryPrecision}`, {
          category: accountingEntry.category,
          categoryPrecision: accountingEntry.categoryPrecision,
          taxRate: accountingEntry.taxRate !== null ? accountingEntry.taxRate.toNumber() : null,
          includingTaxesAmount: accountingEntry.amount.toNumber(),
        });
      }

      const accountingEntriesDiffResult = getDiff(storedLiteAccountingEntries, submittedLiteAccountingEntries);
      const sortedAccountingEntriesDiffResult = sortDiffWithKeys(accountingEntriesDiffResult);

      // Nullable field cannot be used as part of the unique compound... so we need to perform association mutations without unique constraints
      // Ref: https://github.com/prisma/prisma/issues/3197
      sacdDeclaration = await prisma.eventSerieSacdDeclaration.update({
        where: {
          id: sacdDeclarationId,
        },
        data: {
          clientId: input.clientId,
          placeName: input.placeName,
          placeStreet: input.placeStreet,
          placePostalCode: input.placePostalCode,
          placeCity: input.placeCity,
          producer: {
            update: {
              name: input.producer.name,
              officialHeadquartersId: input.producer.officialHeadquartersId,
              headquartersAddress: {
                update: {
                  street: input.producer.headquartersAddress.street,
                  city: input.producer.headquartersAddress.city,
                  postalCode: input.producer.headquartersAddress.postalCode,
                  countryCode: input.producer.headquartersAddress.countryCode,
                  subdivision: input.producer.headquartersAddress.subdivision,
                },
              },
            },
          },
          SacdDeclarationAccountingEntry: {
            deleteMany: sortedAccountingEntriesDiffResult.removed.map((removedEntry) => {
              return {
                sacdDeclarationId: sacdDeclarationId,
                category: removedEntry.model.category,
                categoryPrecision: removedEntry.model.categoryPrecision,
              } satisfies Prisma.SacdDeclarationAccountingEntryScalarWhereInput;
            }),
            create: sortedAccountingEntriesDiffResult.added.map((addedEntry) => {
              return {
                category: addedEntry.model.category,
                categoryPrecision: addedEntry.model.categoryPrecision,
                taxRate: addedEntry.model.taxRate,
                amount: addedEntry.model.includingTaxesAmount,
              } satisfies Prisma.SacdDeclarationAccountingEntryCreateWithoutSacdDeclarationInput;
            }),
            updateMany: sortedAccountingEntriesDiffResult.updated.map((updatedEntry) => {
              return {
                where: {
                  sacdDeclarationId: sacdDeclarationId,
                  category: updatedEntry.model.category,
                  categoryPrecision: updatedEntry.model.categoryPrecision,
                },
                data: {
                  taxRate: updatedEntry.model.taxRate,
                  amount: updatedEntry.model.includingTaxesAmount,
                },
              } satisfies Prisma.SacdDeclarationAccountingEntryUpdateManyWithWhereWithoutSacdDeclarationInput;
            }),
          },
        },
        select: {
          id: true,
          clientId: true,
          placeName: true,
          placeStreet: true,
          placePostalCode: true,
          placeCity: true,
          producer: {
            select: {
              id: true,
              name: true,
              officialHeadquartersId: true,
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
            },
          },
          eventSerieDeclaration: {
            select: {
              id: true,
              transmittedAt: true,
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
        },
      });
    } else {
      const producer = await prisma.sacdDeclarationOrganization.create({
        data: {
          name: input.producer.name,
          officialHeadquartersId: input.producer.officialHeadquartersId,
          headquartersAddress: {
            create: {
              street: input.producer.headquartersAddress.street,
              city: input.producer.headquartersAddress.city,
              postalCode: input.producer.headquartersAddress.postalCode,
              countryCode: input.producer.headquartersAddress.countryCode,
              subdivision: input.producer.headquartersAddress.subdivision,
            },
          },
        },
      });

      sacdDeclaration = await prisma.eventSerieSacdDeclaration.create({
        data: {
          clientId: input.clientId,
          placeName: input.placeName,
          placeStreet: input.placeStreet,
          placePostalCode: input.placePostalCode,
          placeCity: input.placeCity,
          producer: {
            create: {
              name: input.producer.name,
              officialHeadquartersId: input.producer.officialHeadquartersId,
              headquartersAddress: {
                create: {
                  street: input.producer.headquartersAddress.street,
                  city: input.producer.headquartersAddress.city,
                  postalCode: input.producer.headquartersAddress.postalCode,
                  countryCode: input.producer.headquartersAddress.countryCode,
                  subdivision: input.producer.headquartersAddress.subdivision,
                },
              },
            },
          },
          eventSerieDeclaration: {
            create: {
              status: EventSerieDeclarationStatus.PENDING,
              eventSerieId: eventSerie.id,
              transmittedAt: null,
              lastTransmissionError: null,
              lastTransmissionErrorAt: null,
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
        },
        select: {
          id: true,
          clientId: true,
          placeName: true,
          placeStreet: true,
          placePostalCode: true,
          placeCity: true,
          producer: {
            select: {
              id: true,
              name: true,
              officialHeadquartersId: true,
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
            },
          },
          eventSerieDeclaration: {
            select: {
              id: true,
              transmittedAt: true,
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
        },
      });
    }

    return {
      sacdDeclaration: sacdDeclarationPrismaToModel(sacdDeclaration.eventSerieDeclaration.eventSerie, {
        ...sacdDeclaration,
        transmittedAt: sacdDeclaration.eventSerieDeclaration.transmittedAt,
      }),
    };
  }),
});
