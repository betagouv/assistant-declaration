import { EventSerieDeclarationStatus, Prisma } from '@prisma/client';
import { renderToBuffer } from '@react-pdf/renderer';
import slugify from '@sindresorhus/slugify';

import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { getSacdClient } from '@ad/src/core/declaration/sacd';
import { Attachment as EmailAttachment, mailer } from '@ad/src/emails/mailer';
import {
  FillSacdDeclarationSchema,
  FillDeclarationSchema,
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
  declarationPrismaToModel,
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
  getDeclaration: privateProcedure.input(GetSacemDeclarationSchema).query(async ({ ctx, input }) => {
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

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

    // Note: the generated properties calculation is done 2 times but we are fine with that for now
    return {
      declarationWrapper: {
        declaration: existingDeclaration
          ? declarationPrismaToModel(eventSerie, {
              ...existingDeclaration.EventSerieSacemDeclaration!,
              transmittedAt: existingDeclaration.transmittedAt,
            })
          : null,
        placeholder: placeholder,
      } satisfies SacemDeclarationWrapperSchemaType,
    };
  }),
  // TODO: should fill direct value
  fillDeclaration: privateProcedure.input(FillDeclarationSchema).mutation(async ({ ctx, input }) => {
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

    // We have to handle both update and creation since it's implicitely linked to an event serie
    // [WORKAROUND] `upsert` cannot be used to `where` not accepting undefined values (the zero UUID could be a bit at risk so using `create+update`)
    // Ref: https://github.com/prisma/prisma/issues/5233
    let declaration;

    if (existingDeclaration) {
      if (existingDeclaration.transmittedAt) {
        throw transmittedDeclarationCannotBeUpdatedError;
      }

      const declarationId = existingDeclaration.id;

      // Nullable field cannot be used as part of the unique compound... so we need to perform association mutations without unique constraints
      // Ref: https://github.com/prisma/prisma/issues/3197
      declaration = await prisma.eventSerieDeclaration.update({
        where: {
          id: declarationId,
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
      declaration = await prisma.eventSerieDeclaration.create({
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
        },
      });
    }

    return {
      declaration: declarationPrismaToModel(declaration.eventSerieDeclaration.eventSerie, {
        ...declaration,
        transmittedAt: declaration.eventSerieDeclaration.transmittedAt,
      }),
    };
  }),
});
