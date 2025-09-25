import { EventSerieDeclarationStatus, Prisma } from '@prisma/client';
import { renderToBuffer } from '@react-pdf/renderer';
import slugify from '@sindresorhus/slugify';

import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { getSacdClient } from '@ad/src/core/declaration/sacd';
import { Attachment as EmailAttachment, mailer } from '@ad/src/emails/mailer';
import {
  FillDeclarationSchema,
  FillSacdDeclarationSchema,
  GetSacdDeclarationSchema,
  GetSacemDeclarationSchema,
  TransmitDeclarationSchema,
} from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { DeclarationSchema } from '@ad/src/models/entities/declaration/common';
import {
  LiteSacdDeclarationAccountingEntrySchemaType,
  SacdDeclarationSchema,
  SacdDeclarationSchemaType,
  SacdDeclarationWrapperSchemaType,
} from '@ad/src/models/entities/declaration/sacd';
import {
  AccountingCategorySchema,
  AccountingFluxSchema,
  LiteSacemDeclarationAccountingEntrySchemaType,
  SacemDeclarationSchema,
  SacemDeclarationSchemaType,
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
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
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
        taxRate: true,
        expensesAmount: true,
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
                sacemId: true,
                sacdId: true,
                createdAt: true,
                updatedAt: true,
              },
            },
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
            ticketingRevenueTaxRate: true,
            ticketingRevenueDefinedTaxRate: true,
            freeTickets: true,
            paidTickets: true,
            placeOverrideId: true,
            placeCapacityOverride: true,
            audienceOverride: true,
            taxRateOverride: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        EventSerieDeclaration: {
          select: {
            id: true,
            type: true,
            status: true,
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

    const agnosticDeclaration = declarationPrismaToModel(eventSerie);

    // Make sure it has at least a valid structure even if partially filled
    DeclarationSchema.parse(agnosticDeclaration);

    // Then ensure it's correctly fulfilled for each declaration type not sent yet, and associated with
    let sacemDeclaration: SacemDeclarationSchemaType | null = null;
    let sacdDeclaration: SacdDeclarationSchemaType | null = null;

    const declarationsToDeclare: [DeclarationTypeSchemaType, SacemDeclarationSchemaType | SacdDeclarationSchemaType][] = [];

    for (const declarationType of agnosticDeclaration.eventSerie.expectedDeclarationTypes) {
      // If that's a retry, we make sure not transmitting again to organisms
      if (eventSerie.EventSerieDeclaration.find((eSD) => eSD.type === declarationType)?.status === 'PROCESSED') {
        continue;
      }

      switch (declarationType) {
        case 'SACEM':
          sacemDeclaration = SacemDeclarationSchema.parse(agnosticDeclaration);

          declarationsToDeclare.push([declarationType, sacemDeclaration]);

          break;
        case 'SACD':
          sacdDeclaration = SacdDeclarationSchema.parse(agnosticDeclaration);

          // Doing SACD declaration first because it's more likely to fail than sending the email as for Sacem
          declarationsToDeclare.unshift([declarationType, sacdDeclaration]);

          break;
        default:
          throw new Error(`declaration type not handled`);
      }
    }

    if (declarationsToDeclare.length === 0) {
      throw new Error('should not resubmit as all declarations have been declared');
    }

    for (const [declarationType, declarationToDeclare] of declarationsToDeclare) {
      try {
        if (declarationToDeclare === sacemDeclaration) {
          const eventPlacePostalCode: string = sacemDeclaration.eventSerie.placeId; // TODO: get details

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
            sacemDeclaration: sacemDeclaration,
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
              eventSerieName: sacemDeclaration.eventSerie.name,
              originatorFirstname: originatorUser.firstname,
              originatorLastname: originatorUser.lastname,
              originatorEmail: originatorUser.email,
              organizationName: sacemDeclaration.organization.name,
              aboutUrl: linkRegistry.get('about', undefined, { absolute: true }),
              attachments: [declarationAttachment],
            });
          } catch (error) {
            console.error(error);

            throw sacemDeclarationUnsuccessfulError;
          }
        } else if (declarationToDeclare === sacemDeclaration) {
          const sacdClient = getSacdClient(ctx.user.id);

          // Since not tracking token expiration we log in again (but we could improve that)
          await sacdClient.login();

          await sacdClient.declare(sacdDeclaration);
        }

        // If successful mark the declaration as transmitted
        await prisma.eventSerieDeclaration.upsert({
          where: {
            eventSerieId_type: {
              eventSerieId: agnosticDeclaration.eventSerie.id,
              type: declarationType,
            },
          },
          create: {
            eventSerieId: agnosticDeclaration.eventSerie.id,
            type: declarationType,
            transmittedAt: new Date(),
            status: EventSerieDeclarationStatus.PROCESSED,
          },
          update: {
            status: EventSerieDeclarationStatus.PROCESSED,
            transmittedAt: new Date(),
            lastTransmissionError: null,
            lastTransmissionErrorAt: null,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          const lastTransmissionError = error instanceof BusinessError ? error.code : error.message;
          const lastTransmissionErrorAt = new Date();

          // Keep track of errors to help debugging
          await prisma.eventSerieDeclaration.upsert({
            where: {
              eventSerieId_type: {
                eventSerieId: agnosticDeclaration.eventSerie.id,
                type: declarationType,
              },
            },
            create: {
              eventSerieId: agnosticDeclaration.eventSerie.id,
              type: declarationType,
              status: EventSerieDeclarationStatus.PENDING,
            },
            update: {
              lastTransmissionError: lastTransmissionError,
              lastTransmissionErrorAt: lastTransmissionErrorAt,
            },
          });
        }

        throw error;
      }
    }

    return undefined;
  }),
  // getDeclaration: privateProcedure.input(GetSacemDeclarationSchema).query(async ({ ctx, input }) => {
  //   const eventSerie = await prisma.eventSerie.findUnique({
  //     where: {
  //       id: input.eventSerieId,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       startAt: true,
  //       endAt: true,
  //       taxRate: true,
  //       ticketingSystem: {
  //         select: {
  //           organization: {
  //             select: {
  //               id: true,
  //               name: true,
  //             },
  //           },
  //         },
  //       },
  //       EventSerieDeclaration: {
  //         select: {
  //           id: true,
  //           transmittedAt: true,
  //           EventSerieSacemDeclaration: {
  //             select: {
  //               id: true,
  //               clientId: true,
  //               placeName: true,
  //               placeCapacity: true,
  //               placePostalCode: true,
  //               managerName: true,
  //               managerTitle: true,
  //               performanceType: true,
  //               declarationPlace: true,
  //               SacemDeclarationAccountingEntry: {
  //                 select: {
  //                   flux: true,
  //                   category: true,
  //                   categoryPrecision: true,
  //                   taxRate: true,
  //                   amount: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //       Event: {
  //         select: {
  //           EventCategoryTickets: {
  //             select: {
  //               total: true,
  //               totalOverride: true,
  //               priceOverride: true,
  //               category: {
  //                 select: {
  //                   price: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!eventSerie) {
  //     throw eventSerieNotFoundError;
  //   }

  //   // Before returning, make sure the caller has rights on this authority ;)
  //   if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, ctx.user.id))) {
  //     throw organizationCollaboratorRoleRequiredError;
  //   }

  //   // Get suggestions from previous declarations to ease the filling of the form
  //   // Note: `distinct` cannot be done on different properties get unique values, `groupBy` cannot have an orderBy+limit, so using `findMany` with local logic
  //   const previousDeclarations = await prisma.eventSerieSacemDeclaration.findMany({
  //     where: {
  //       eventSerieDeclaration: {
  //         eventSerie: {
  //           ticketingSystem: {
  //             organizationId: eventSerie.ticketingSystem.organization.id,
  //           },
  //         },
  //       },
  //     },
  //     select: {
  //       clientId: true,
  //       placeName: true,
  //       placeCapacity: true,
  //       placePostalCode: true,
  //       managerName: true,
  //       managerTitle: true,
  //       performanceType: true,
  //       declarationPlace: true,
  //       SacemDeclarationAccountingEntry: {
  //         select: {
  //           flux: true,
  //           category: true,
  //           categoryPrecision: true,
  //           taxRate: true,
  //           amount: true,
  //         },
  //       },
  //     },
  //     distinct: ['clientId', 'placeName', 'placeCapacity', 'placePostalCode', 'managerName', 'managerTitle', 'performanceType', 'declarationPlace'], // At least the distinct may remove duplicates for the whole chain
  //     // Get only a few of the last declarations since it should representative
  //     orderBy: {
  //       updatedAt: 'desc',
  //     },
  //     take: 10,
  //   });

  //   const { revenues, expenses, ...computedPlaceholder } = sacemPlaceholderDeclarationPrismaToModel(eventSerie);

  //   const placeholder: SacemDeclarationWrapperSchemaType['placeholder'] = {
  //     ...computedPlaceholder,
  //     clientId: [],
  //     placeName: [],
  //     placeCapacity: [],
  //     placePostalCode: [],
  //     managerName: [],
  //     managerTitle: [],
  //     performanceType: [],
  //     declarationPlace: [],
  //     revenuesOptions: {
  //       ticketing: { taxRate: [], amount: [] },
  //       consumptions: { taxRate: [], amount: [] },
  //       catering: { taxRate: [], amount: [] },
  //       programSales: { taxRate: [], amount: [] },
  //       other: { taxRate: [], amount: [] },
  //       otherCategories: [],
  //     },
  //     expensesOptions: {
  //       engagementContracts: { taxRate: [], amount: [] },
  //       rightsTransferContracts: { taxRate: [], amount: [] },
  //       corealizationContracts: { taxRate: [], amount: [] },
  //       coproductionContracts: { taxRate: [], amount: [] },
  //       other: { taxRate: [], amount: [] },
  //       otherCategories: [],
  //     },
  //   };

  //   // Fill with unique values
  //   for (const previousDeclaration of previousDeclarations) {
  //     if (!placeholder.clientId.includes(previousDeclaration.clientId)) placeholder.clientId.push(previousDeclaration.clientId);
  //     if (!placeholder.placeName.includes(previousDeclaration.placeName)) placeholder.placeName.push(previousDeclaration.placeName);
  //     if (!placeholder.placeCapacity.includes(previousDeclaration.placeCapacity)) placeholder.placeCapacity.push(previousDeclaration.placeCapacity);
  //     if (!placeholder.placePostalCode.includes(previousDeclaration.placePostalCode))
  //       placeholder.placePostalCode.push(previousDeclaration.placePostalCode);
  //     if (!placeholder.managerName.includes(previousDeclaration.managerName)) placeholder.managerName.push(previousDeclaration.managerName);
  //     if (!placeholder.managerTitle.includes(previousDeclaration.managerTitle)) placeholder.managerTitle.push(previousDeclaration.managerTitle);
  //     if (!placeholder.performanceType.includes(previousDeclaration.performanceType))
  //       placeholder.performanceType.push(previousDeclaration.performanceType);
  //     if (!placeholder.declarationPlace.includes(previousDeclaration.declarationPlace))
  //       placeholder.declarationPlace.push(previousDeclaration.declarationPlace);

  //   const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

  //   // Note: the generated properties calculation is done 2 times but we are fine with that for now
  //   return {
  //     declarationWrapper: {
  //       declaration: existingDeclaration
  //         ? declarationPrismaToModel(eventSerie, {
  //             ...existingDeclaration.EventSerieSacemDeclaration!,
  //             transmittedAt: existingDeclaration.transmittedAt,
  //           })
  //         : null,
  //       placeholder: placeholder,
  //     } satisfies SacemDeclarationWrapperSchemaType,
  //   };
  // }),
  // // TODO: should fill direct value
  // fillDeclaration: privateProcedure.input(FillDeclarationSchema).mutation(async ({ ctx, input }) => {
  //   const eventSerie = await prisma.eventSerie.findUnique({
  //     where: {
  //       id: input.eventSerieId,
  //     },
  //     select: {
  //       id: true,
  //       ticketingSystem: {
  //         select: {
  //           organizationId: true,
  //         },
  //       },
  //       EventSerieDeclaration: {
  //         select: {
  //           id: true,
  //           transmittedAt: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!eventSerie) {
  //     throw eventSerieNotFoundError;
  //   }

  //   // Before returning, make sure the caller has rights on this authority ;)
  //   if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organizationId, ctx.user.id))) {
  //     throw organizationCollaboratorRoleRequiredError;
  //   }

  //   const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

  //   // We have to handle both update and creation since it's implicitely linked to an event serie
  //   // [WORKAROUND] `upsert` cannot be used to `where` not accepting undefined values (the zero UUID could be a bit at risk so using `create+update`)
  //   // Ref: https://github.com/prisma/prisma/issues/5233
  //   let declaration;

  //   if (existingDeclaration) {
  //     if (existingDeclaration.transmittedAt) {
  //       throw transmittedDeclarationCannotBeUpdatedError;
  //     }

  //     const declarationId = existingDeclaration.id;

  //     // Nullable field cannot be used as part of the unique compound... so we need to perform association mutations without unique constraints
  //     // Ref: https://github.com/prisma/prisma/issues/3197
  //     declaration = await prisma.eventSerieDeclaration.update({
  //       where: {
  //         id: declarationId,
  //       },
  //       data: {
  //         clientId: input.clientId,
  //         placeName: input.placeName,
  //         placeCapacity: input.placeCapacity,
  //         placePostalCode: input.placePostalCode,
  //         managerName: input.managerName,
  //         managerTitle: input.managerTitle,
  //         performanceType: input.performanceType,
  //         declarationPlace: input.declarationPlace,
  //       },
  //       select: {
  //         id: true,
  //         clientId: true,
  //         placeName: true,
  //         placeCapacity: true,
  //         placePostalCode: true,
  //         managerName: true,
  //         managerTitle: true,
  //         performanceType: true,
  //         declarationPlace: true,
  //         eventSerieDeclaration: {
  //           select: {
  //             id: true,
  //             transmittedAt: true,
  //             eventSerie: {
  //               select: {
  //                 id: true,
  //                 name: true,
  //                 startAt: true,
  //                 endAt: true,
  //                 taxRate: true,
  //                 ticketingSystem: {
  //                   select: {
  //                     organization: {
  //                       select: {
  //                         name: true,
  //                       },
  //                     },
  //                   },
  //                 },
  //                 Event: {
  //                   select: {
  //                     EventCategoryTickets: {
  //                       select: {
  //                         total: true,
  //                         totalOverride: true,
  //                         priceOverride: true,
  //                         category: {
  //                           select: {
  //                             price: true,
  //                           },
  //                         },
  //                       },
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //         SacemDeclarationAccountingEntry: {
  //           select: {
  //             flux: true,
  //             category: true,
  //             categoryPrecision: true,
  //             taxRate: true,
  //             amount: true,
  //           },
  //         },
  //       },
  //     });
  //   } else {
  //     declaration = await prisma.eventSerieDeclaration.create({
  //       data: {
  //         clientId: input.clientId,
  //         placeName: input.placeName,
  //         placeCapacity: input.placeCapacity,
  //         placePostalCode: input.placePostalCode,
  //         managerName: input.managerName,
  //         managerTitle: input.managerTitle,
  //         performanceType: input.performanceType,
  //         declarationPlace: input.declarationPlace,
  //         eventSerieDeclaration: {
  //           create: {
  //             status: EventSerieDeclarationStatus.PENDING,
  //             eventSerieId: eventSerie.id,
  //             transmittedAt: null,
  //             lastTransmissionError: null,
  //             lastTransmissionErrorAt: null,
  //           },
  //         },
  //       },
  //       select: {
  //         id: true,
  //         clientId: true,
  //         placeName: true,
  //         placeCapacity: true,
  //         placePostalCode: true,
  //         managerName: true,
  //         managerTitle: true,
  //         performanceType: true,
  //         declarationPlace: true,
  //         eventSerieDeclaration: {
  //           select: {
  //             id: true,
  //             transmittedAt: true,
  //             eventSerie: {
  //               select: {
  //                 id: true,
  //                 name: true,
  //                 startAt: true,
  //                 endAt: true,
  //                 taxRate: true,
  //                 ticketingSystem: {
  //                   select: {
  //                     organization: {
  //                       select: {
  //                         name: true,
  //                       },
  //                     },
  //                   },
  //                 },
  //                 Event: {
  //                   select: {
  //                     EventCategoryTickets: {
  //                       select: {
  //                         total: true,
  //                         totalOverride: true,
  //                         priceOverride: true,
  //                         category: {
  //                           select: {
  //                             price: true,
  //                           },
  //                         },
  //                       },
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });
  //   }

  //   return {
  //     declaration: declarationPrismaToModel(declaration.eventSerieDeclaration.eventSerie, {
  //       ...declaration,
  //       transmittedAt: declaration.eventSerieDeclaration.transmittedAt,
  //     }),
  //   };
  // }),
});
