import { EventSerieAttachmentType, EventSerieDeclarationStatus, Prisma, SacdAgency } from '@prisma/client';
import { renderToBuffer } from '@react-pdf/renderer';
import slugify from '@sindresorhus/slugify';
import { secondsToMilliseconds } from 'date-fns';
import diff from 'microdiff';
import { z } from 'zod';

import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { getSacdClient } from '@ad/src/core/declaration/sacd';
import { getSibilClient } from '@ad/src/core/declaration/sibil';
import { Attachment as EmailAttachment, mailer } from '@ad/src/emails/mailer';
import {
  FillDeclarationSchema,
  GetDeclarationSchema,
  TransmitDeclarationSchema,
  fillDeclarationAttachmentsMax,
} from '@ad/src/models/actions/declaration';
import { AttachmentKindSchema } from '@ad/src/models/entities/attachment';
import { DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { DeclarationInputSchema, DeclarationSchema, DeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/common';
import { SacdDeclarationSchema, SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { SacemDeclarationSchema, SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
import { SibilDeclarationSchema, SibilDeclarationSchemaType } from '@ad/src/models/entities/declaration/sibil';
import {
  BusinessError,
  BusinessZodError,
  atLeastOneDeclarationTypeToTransmitError,
  atLeastOneEventToTransmitError,
  eventSerieNotFoundError,
  invalidDeclarationFieldsToTransmitError,
  organizationCollaboratorRoleRequiredError,
  sacdAgencyNotFoundError,
  sacdAttachmentsDeclarationUnsuccessfulError,
  sacemAgencyNotFoundError,
  sacemDeclarationUnsuccessfulError,
  transmittedDeclarationCannotBeUpdatedError,
} from '@ad/src/models/entities/errors';
import { EventSchemaType, EventSerieSchemaType } from '@ad/src/models/entities/event';
import { PlaceSchemaType } from '@ad/src/models/entities/place';
import { prisma } from '@ad/src/prisma/client';
import { formatSafeAttachmentsToProcess } from '@ad/src/server/routers/common/attachment';
import { attachmentOnEventSeriePrismaToModel, attachmentPrismaToModel, declarationPrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { getSimpleArraysDiff, sortSimpleArraysDiff } from '@ad/src/utils/comparaison';
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
                sibilUsername: true,
                sibilPassword: true,
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
        AttachmentsOnEventSeries: {
          select: {
            attachmentId: true,
            type: true,
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
    let sibilDeclaration: SibilDeclarationSchemaType | null = null;

    const declarationsToDeclare: [DeclarationTypeSchemaType, SacemDeclarationSchemaType | SacdDeclarationSchemaType | SibilDeclarationSchemaType][] =
      [];

    if (agnosticDeclaration.eventSerie.expectedDeclarationTypes.length === 0) {
      throw atLeastOneDeclarationTypeToTransmitError;
    }

    const validationIssues: z.core.$ZodIssue[] = [];

    for (const declarationType of agnosticDeclaration.eventSerie.expectedDeclarationTypes) {
      // If that's a retry, we make sure not transmitting again to organisms
      if (eventSerie.EventSerieDeclaration.find((eSD) => eSD.type === declarationType)?.status === 'PROCESSED') {
        continue;
      }

      switch (declarationType) {
        case 'SACEM':
          const sacemDeclarationParsing = SacemDeclarationSchema.safeParse(agnosticDeclaration);

          if (!sacemDeclarationParsing.success) {
            validationIssues.push(...sacemDeclarationParsing.error.issues);
          } else {
            sacemDeclaration = sacemDeclarationParsing.data;

            declarationsToDeclare.push([declarationType, sacemDeclaration]);
          }

          break;
        case 'SACD':
          const sacdDeclarationParsing = SacdDeclarationSchema.safeParse(agnosticDeclaration);

          if (!sacdDeclarationParsing.success) {
            validationIssues.push(...sacdDeclarationParsing.error.issues);
          } else {
            sacdDeclaration = sacdDeclarationParsing.data;

            // Doing SACD declaration in the first ones because it's more likely to fail than sending the email as for Sacem
            declarationsToDeclare.unshift([declarationType, sacdDeclaration]);
          }

          break;
        case 'SIBIL':
          const sibilDeclarationParsing = SibilDeclarationSchema.safeParse(agnosticDeclaration);

          if (!sibilDeclarationParsing.success) {
            validationIssues.push(...sibilDeclarationParsing.error.issues);
          } else {
            sibilDeclaration = sibilDeclarationParsing.data;

            // Doing SIBIL declaration in the first ones because it's more likely to fail than sending the email as for Sacem
            declarationsToDeclare.unshift([declarationType, sibilDeclaration]);
          }

          break;
        default:
          throw new Error(`declaration type not handled`);
      }
    }

    if (validationIssues.length > 0) {
      // Due to different organism validating the same field, it's possible a field name has multiple error items
      // but we consider it fine, the last one will be displayed in the UI, and after the submit it would see the other one if any (of course, the combination across organisms must be possible, not "be string, and be number")
      throw new BusinessZodError(invalidDeclarationFieldsToTransmitError, validationIssues);
    } else if (declarationsToDeclare.length === 0) {
      throw new Error('should not resubmit as all declarations have been declared');
    } else if (agnosticDeclaration.events.length === 0) {
      throw atLeastOneEventToTransmitError;
    }

    // Retrieve attachments if everything is alright (no need of loading them in memory in case of a input error)
    const eventSerieEnhancedAttachments = await prisma.attachmentsOnEventSeries.findMany({
      where: {
        attachmentId: { in: eventSerie.AttachmentsOnEventSeries.map((aOES) => aOES.attachmentId) },
      },
      select: {
        type: true,
        attachment: {
          select: {
            contentType: true,
            name: true,
            value: true,
          },
        },
      },
    });

    assert(eventSerieEnhancedAttachments.length === eventSerie.AttachmentsOnEventSeries.length, 'all attachments should be retrieved');

    for (const [declarationType, declarationToDeclare] of declarationsToDeclare) {
      try {
        if (declarationToDeclare === sacemDeclaration) {
          const eventPlacePostalCode: string = sacemDeclaration.eventSerie.place.address.postalCode;

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

          const attachments: EmailAttachment[] = [
            declarationAttachment,
            ...eventSerieEnhancedAttachments
              .filter((eSEA) => {
                // No need to attach files that were needed for other organisms
                // Note: the "OTHER" type is the default one and it's always included (in case the declarant forgot to classify it, or to give more contexts to organisms)
                return (['ARTISTIC_CONTRACT', 'PERFORMED_WORK_PROGRAM', 'REVENUE_STATEMENT', 'OTHER'] as EventSerieAttachmentType[]).includes(
                  eSEA.type
                );
              })
              .map((eSEA) => {
                return {
                  contentType: eSEA.attachment.contentType,
                  filename: eSEA.attachment.name || undefined,
                  content: Buffer.from(eSEA.attachment.value),
                  inline: false, // That's not attachments in the middle of the content
                };
              }),
          ];

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
              attachments: attachments,
            });
          } catch (error) {
            console.error(error);

            throw sacemDeclarationUnsuccessfulError;
          }
        } else if (declarationToDeclare === sacdDeclaration) {
          const sacdClient = getSacdClient(ctx.user.id);

          const sacdAttachments = eventSerieEnhancedAttachments.filter((eSEA) => {
            // No need to attach files that were needed for other organisms
            // Note: the "OTHER" type is the default one and it's always included (in case the declarant forgot to classify it, or to give more contexts to organisms)
            return (['ARTISTIC_CONTRACT', 'OTHER'] as EventSerieAttachmentType[]).includes(eSEA.type);
          });
          const sendAttachments = sacdAttachments.length > 0;

          // Before sending any information outside we make sure of all validation
          let sacdAgency: Pick<SacdAgency, 'email'> | null = null;
          if (sendAttachments) {
            const eventPlacePostalCode: string = sacdDeclaration.eventSerie.place.address.postalCode;

            sacdAgency = await prisma.sacdAgency.findFirst({
              where: {
                matchingFrenchPostalCodesPrefixes: {
                  hasSome: [
                    // SACD is providing only prefixes with 2, 3 or 5 digits, no need to look at others
                    eventPlacePostalCode.substring(0, 2),
                    eventPlacePostalCode.substring(0, 3),
                    eventPlacePostalCode.substring(0, 5),
                  ],
                },
              },
              select: {
                email: true,
              },
            });

            if (!sacdAgency) {
              throw sacdAgencyNotFoundError;
            }
          }

          // Since not tracking token expiration we log in again (but we could improve that)
          await sacdClient.login();

          await sacdClient.declare(sacdDeclaration);

          if (sendAttachments) {
            assert(sacdAgency);

            const attachments: EmailAttachment[] = sacdAttachments.map((sA) => {
              return {
                contentType: sA.attachment.contentType,
                filename: sA.attachment.name || undefined,
                content: Buffer.from(sA.attachment.value),
                inline: false, // That's not attachments in the middle of the content
              };
            });

            try {
              await mailer.sendDeclarationAttachmentsToSacdAgency({
                recipient: sacdAgency.email,
                replyTo: originatorUser.email, // We give the SACD the possibility to directly converse with the declarer
                eventSerieName: sacdDeclaration.eventSerie.name,
                originatorFirstname: originatorUser.firstname,
                originatorLastname: originatorUser.lastname,
                originatorEmail: originatorUser.email,
                organizationName: sacdDeclaration.organization.name,
                aboutUrl: linkRegistry.get('about', undefined, { absolute: true }),
                attachments: attachments,
              });
            } catch (error) {
              console.error(error);

              // TODO: we have no way to retry email without resending data to the SACD API
              // the ideal would be either to be able to check from their API first it exists, or that
              // the attachments are soon transmit through API instead of separately through email
              throw sacdAttachmentsDeclarationUnsuccessfulError;
            }
          }
        } else if (declarationToDeclare === sibilDeclaration) {
          const sibilClient = getSibilClient(ctx.user.id, sibilDeclaration.organization.sibilUsername, sibilDeclaration.organization.sibilPassword);

          await sibilClient.login();

          await sibilClient.declare(sibilDeclaration);
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
              lastTransmissionError: lastTransmissionError,
              lastTransmissionErrorAt: lastTransmissionErrorAt,
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
  getDeclaration: privateProcedure.input(GetDeclarationSchema).query(async ({ ctx, input }) => {
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
            name: true,
            organization: {
              select: {
                id: true,
                name: true,
                officialId: true,
                officialHeadquartersId: true,
                headquartersAddressId: true,
                sacemId: true,
                sacdId: true,
                sibilUsername: true,
                sibilPassword: true,
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
        AttachmentsOnEventSeries: {
          select: {
            attachmentId: true,
            type: true,
            attachment: {
              select: {
                id: true,
                contentType: true,
                name: true,
                size: true,
              },
            },
          },
        },
        EventSerieDeclaration: {
          select: {
            id: true,
            type: true,
            status: true,
            lastTransmissionError: true,
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
    const previousDeclarations = await prisma.eventSerie.findMany({
      where: {
        ticketingSystem: {
          organizationId: eventSerie.ticketingSystem.organization.id,
        },
        EventSerieDeclaration: {
          // Ensure the serie has been declared to consider administrative information
          some: {},
        },
      },
      select: {
        producerOfficialId: true,
        producerName: true,
        placeId: true,
        placeCapacity: true,
        place: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      distinct: ['producerOfficialId', 'producerName', 'placeId', 'placeCapacity'], // At least the distinct may remove duplicates for the whole chain
      // Get only a few of the last declarations since it should representative
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    const placeholder: DeclarationWrapperSchemaType['placeholder'] = {
      producer: [],
      place: [],
      placeCapacity: [],
    };

    // Fill with unique values
    // Since some are optional we ensure they are not null
    for (const previousDeclaration of previousDeclarations) {
      if (
        previousDeclaration.producerOfficialId &&
        previousDeclaration.producerName &&
        !placeholder.producer.find((p) => p.officialId === previousDeclaration.producerOfficialId && p.name === previousDeclaration.producerName)
      )
        placeholder.producer.push({
          officialId: previousDeclaration.producerOfficialId,
          name: previousDeclaration.producerName,
        });
      if (previousDeclaration.place && !placeholder.place.find((p) => p.id === previousDeclaration.place!.id)) {
        placeholder.place.push({
          id: previousDeclaration.place.id,
          name: previousDeclaration.place.name,
          address: {
            id: previousDeclaration.place.address.id,
            street: previousDeclaration.place.address.street,
            city: previousDeclaration.place.address.city,
            postalCode: previousDeclaration.place.address.postalCode,
            subdivision: previousDeclaration.place.address.subdivision,
            countryCode: previousDeclaration.place.address.countryCode,
          },
        });
      }
      if (previousDeclaration.placeCapacity && !placeholder.placeCapacity.includes(previousDeclaration.placeCapacity))
        placeholder.placeCapacity.push(previousDeclaration.placeCapacity);
    }

    // Attachments links must be generated on the fly asynchronously, that's why they are mapped separately than the rest (outside `declarationPrismaToModel()`)
    const attachmentsWithTypes = await Promise.all(
      eventSerie.AttachmentsOnEventSeries.map(async (aOES) => {
        const { id, type } = attachmentOnEventSeriePrismaToModel(aOES);

        return {
          ...(await attachmentPrismaToModel(aOES.attachment)),
          type: type,
        };
      })
    );

    const declarationModel = declarationPrismaToModel(eventSerie);

    return {
      declarationWrapper: {
        declaration: {
          ...declarationModel,
          eventSerie: {
            ...declarationModel.eventSerie,
            attachments: attachmentsWithTypes,
          },
        },
        ticketingSystemName: eventSerie.ticketingSystem.name,
        placeholder: placeholder,
        transmissions: eventSerie.EventSerieDeclaration.map((eSD) => {
          return {
            type: eSD.type,
            status: eSD.status,
            hasError: !!eSD.lastTransmissionError,
          };
        }),
      } satisfies DeclarationWrapperSchemaType,
    };
  }),
  fillDeclaration: privateProcedure.input(FillDeclarationSchema).mutation(async ({ ctx, input }) => {
    const returnedEventSerie = await prisma.$transaction(
      async (tx) => {
        const eventSerie = await tx.eventSerie.findUnique({
          where: {
            id: input.eventSerieId,
          },
          select: {
            id: true,
            name: true,
            placeId: true,
            ticketingRevenueTaxRate: true,
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
                    sibilUsername: true,
                    sibilPassword: true,
                    headquartersAddress: {
                      select: {
                        id: true,
                        street: true,
                        city: true,
                        postalCode: true,
                        subdivision: true,
                        countryCode: true,
                      },
                    },
                  },
                },
              },
            },
            Event: {
              select: {
                id: true,
                placeOverrideId: true,
                // Properties below are used to know if they have been updated
                ticketingRevenueIncludingTaxes: true,
                ticketingRevenueExcludingTaxes: true,
                ticketingRevenueTaxRateOverride: true,
                freeTickets: true,
                paidTickets: true,
              },
            },
            AttachmentsOnEventSeries: {
              select: {
                type: true,
                attachment: {
                  select: {
                    id: true,
                  },
                },
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
        if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, ctx.user.id))) {
          throw organizationCollaboratorRoleRequiredError;
        }

        // TODO: maybe we could allow the user to add data if he just added an organism...
        // but for simplicity for now we consider he had to select all organisms correctly before the first transmission
        // Note: we do not consider status "PENDING/PROCESSED" as creation means an attempt has been done
        if (eventSerie.EventSerieDeclaration.length > 0) {
          throw transmittedDeclarationCannotBeUpdatedError;
        }

        // Make sure it has at least a valid structure even if partially filled
        const agnosticDeclaration = DeclarationInputSchema.parse({
          organization: {
            id: eventSerie.ticketingSystem.organization.id,
            name: eventSerie.ticketingSystem.organization.name,
            officialId: eventSerie.ticketingSystem.organization.officialId,
            officialHeadquartersId: eventSerie.ticketingSystem.organization.officialHeadquartersId,
            headquartersAddress: eventSerie.ticketingSystem.organization.headquartersAddress,
            sacemId: input.organization.sacemId ?? eventSerie.ticketingSystem.organization.sacemId,
            sacdId: input.organization.sacdId ?? eventSerie.ticketingSystem.organization.sacdId,
            sibilUsername: input.organization.sibil?.username ?? eventSerie.ticketingSystem.organization.sibilUsername,
            sibilPassword: input.organization.sibil?.password ?? eventSerie.ticketingSystem.organization.sibilPassword,
          },
          eventSerie: {
            id: eventSerie.id,
            name: eventSerie.name,
            producerOfficialId: input.eventSerie.producer?.officialId ?? null,
            producerName: input.eventSerie.producer?.name ?? null,
            performanceType: input.eventSerie.performanceType,
            expectedDeclarationTypes: input.eventSerie.expectedDeclarationTypes,
            place: {
              name: input.eventSerie.place.name,
              address: input.eventSerie.place.address,
            },
            placeCapacity: input.eventSerie.placeCapacity,
            audience: input.eventSerie.audience,
            ticketingRevenueTaxRate: input.eventSerie.ticketingRevenueTaxRate,
            expensesIncludingTaxes: input.eventSerie.expensesIncludingTaxes,
            expensesExcludingTaxes: input.eventSerie.expensesExcludingTaxes,
            expensesTaxRate: input.eventSerie.expensesTaxRate,
            introductionFeesExpensesIncludingTaxes: input.eventSerie.introductionFeesExpensesIncludingTaxes,
            introductionFeesExpensesExcludingTaxes: input.eventSerie.introductionFeesExpensesExcludingTaxes,
            introductionFeesExpensesTaxRate: input.eventSerie.introductionFeesExpensesTaxRate,
            circusSpecificExpensesIncludingTaxes: input.eventSerie.circusSpecificExpensesIncludingTaxes,
            circusSpecificExpensesExcludingTaxes: input.eventSerie.circusSpecificExpensesExcludingTaxes,
            circusSpecificExpensesTaxRate: input.eventSerie.circusSpecificExpensesTaxRate,
            attachments: input.eventSerie.attachments,
          },
          events: input.events.map((event) => {
            return {
              id: event.id,
              startAt: event.startAt,
              endAt: event.endAt,
              ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes,
              ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes,
              consumptionsRevenueIncludingTaxes: event.consumptionsRevenueIncludingTaxes,
              consumptionsRevenueExcludingTaxes: event.consumptionsRevenueExcludingTaxes,
              // consumptionsRevenueTaxRate: event.consumptionsRevenueTaxRate,
              consumptionsRevenueTaxRate: null,
              cateringRevenueIncludingTaxes: event.cateringRevenueIncludingTaxes,
              cateringRevenueExcludingTaxes: event.cateringRevenueExcludingTaxes,
              // cateringRevenueTaxRate: event.cateringRevenueTaxRate,
              cateringRevenueTaxRate: null,
              programSalesRevenueIncludingTaxes: event.programSalesRevenueIncludingTaxes,
              programSalesRevenueExcludingTaxes: event.programSalesRevenueExcludingTaxes,
              // programSalesRevenueTaxRate: event.programSalesRevenueTaxRate,
              programSalesRevenueTaxRate: null,
              otherRevenueIncludingTaxes: event.otherRevenueIncludingTaxes,
              otherRevenueExcludingTaxes: event.otherRevenueExcludingTaxes,
              // otherRevenueTaxRate: event.otherRevenueTaxRate,
              otherRevenueTaxRate: null,
              freeTickets: event.freeTickets,
              paidTickets: event.paidTickets,
              placeOverride: {
                name: event.placeOverride.name,
                address: event.placeOverride.address,
              },
              placeCapacityOverride: event.placeCapacityOverride,
              audienceOverride: event.audienceOverride,
              ticketingRevenueTaxRateOverride: event.ticketingRevenueTaxRateOverride,
            };
          }),
        });

        // The security about attaching documents is managed in the following helper
        const { attachmentsToAdd, attachmentsToRemove, attachmentsUnchanged, markNewAttachmentsAsUsed } = await formatSafeAttachmentsToProcess(
          AttachmentKindSchema.enum.EVENT_SERIE_DOCUMENT,
          agnosticDeclaration.eventSerie.attachments.map((attachment) => attachment.id),
          eventSerie.AttachmentsOnEventSeries.map((aOES) => aOES.attachment.id),
          {
            maxAttachmentsTotal: fillDeclarationAttachmentsMax,
            prismaInstance: tx,
          }
        );

        if (attachmentsToAdd.length > 0) {
          await tx.attachmentsOnEventSeries.createMany({
            skipDuplicates: true,
            data: attachmentsToAdd.map((attachmentId) => {
              const attachmentWithType = agnosticDeclaration.eventSerie.attachments.find((eSEA) => eSEA.id === attachmentId);

              assert(attachmentWithType);

              return {
                eventSerieId: eventSerie.id,
                attachmentId: attachmentId,
                type: attachmentWithType.type,
              };
            }),
          });
        }

        if (attachmentsToRemove.length > 0) {
          await tx.attachmentsOnEventSeries.deleteMany({
            where: {
              eventSerieId: eventSerie.id,
              attachmentId: {
                in: attachmentsToRemove.map((attachmentId) => attachmentId),
              },
            },
          });
        }

        await markNewAttachmentsAsUsed();

        // An attachment unchanged could still receive an update about its own type
        for (const unchangedAttachmentId of attachmentsUnchanged) {
          const attachmentWithType = agnosticDeclaration.eventSerie.attachments.find((eSEA) => eSEA.id === unchangedAttachmentId);

          assert(attachmentWithType);

          await tx.attachmentsOnEventSeries.update({
            where: {
              eventSerieId_attachmentId: {
                eventSerieId: eventSerie.id,
                attachmentId: unchangedAttachmentId,
              },
            },
            data: {
              type: attachmentWithType.type,
            },
          });
        }

        const oldPlacesIds = new Set<string>();
        const newPlacesIds = new Set<string>();

        eventSerie.placeId && oldPlacesIds.add(eventSerie.placeId);
        eventSerie.Event.forEach((event) => event.placeOverrideId && oldPlacesIds.add(event.placeOverrideId));

        let defaultPlace: PlaceSchemaType | null = null;

        // Only consider it if both values are provided
        if (agnosticDeclaration.eventSerie.place.name !== null && agnosticDeclaration.eventSerie.place.address !== null) {
          // The place is based on raw data and not unique ID because it would be too complicated to ensure in case the user type it again without selecting the autocomplete menu
          const existingPlace = await tx.place.findFirst({
            where: {
              EventSerie: {
                every: {
                  ticketingSystem: {
                    organizationId: eventSerie.ticketingSystem.organization.id, // Ensure not messing with places from other companies
                  },
                },
              },
              name: agnosticDeclaration.eventSerie.place.name,
              address: {
                street: agnosticDeclaration.eventSerie.place.address.street,
                city: agnosticDeclaration.eventSerie.place.address.city,
                postalCode: agnosticDeclaration.eventSerie.place.address.postalCode,
                countryCode: agnosticDeclaration.eventSerie.place.address.countryCode,
                subdivision: agnosticDeclaration.eventSerie.place.address.subdivision,
              },
            },
            select: {
              id: true,
              address: {
                select: {
                  id: true,
                },
              },
            },
          });

          if (existingPlace) {
            defaultPlace = {
              id: existingPlace.id,
              name: agnosticDeclaration.eventSerie.place.name,
              address: {
                id: existingPlace.address.id,
                ...agnosticDeclaration.eventSerie.place.address,
              },
            };
          } else {
            const createdDefaultPlace = await tx.place.create({
              data: {
                name: agnosticDeclaration.eventSerie.place.name,
                address: {
                  create: {
                    street: agnosticDeclaration.eventSerie.place.address.street,
                    city: agnosticDeclaration.eventSerie.place.address.city,
                    postalCode: agnosticDeclaration.eventSerie.place.address.postalCode,
                    countryCode: agnosticDeclaration.eventSerie.place.address.countryCode,
                    subdivision: agnosticDeclaration.eventSerie.place.address.subdivision,
                  },
                },
              },
              select: {
                id: true,
                address: {
                  select: {
                    id: true,
                  },
                },
              },
            });

            defaultPlace = {
              id: createdDefaultPlace.id,
              name: agnosticDeclaration.eventSerie.place.name,
              address: {
                id: createdDefaultPlace.address.id,
                ...agnosticDeclaration.eventSerie.place.address,
              },
            };
          }
        }

        defaultPlace && newPlacesIds.add(defaultPlace.id);

        // Do the same for each event, and reuse the default place if same values
        for (const event of agnosticDeclaration.events) {
          let eventPlace: PlaceSchemaType | null = null; // If none it would reuse the default specified

          if (event.placeOverride.name !== null && event.placeOverride.address !== null) {
            if (
              defaultPlace !== null &&
              event.placeOverride.name === defaultPlace.name &&
              event.placeOverride.address.street === defaultPlace.address.street &&
              event.placeOverride.address.city === defaultPlace.address.city &&
              event.placeOverride.address.postalCode === defaultPlace.address.postalCode &&
              event.placeOverride.address.countryCode === defaultPlace.address.countryCode &&
              event.placeOverride.address.subdivision === defaultPlace.address.subdivision
            ) {
              eventPlace = null; // Should not override the default if same values
            } else {
              const existingPlace = await tx.place.findFirst({
                where: {
                  EventSerie: {
                    every: {
                      ticketingSystem: {
                        organizationId: eventSerie.ticketingSystem.organization.id, // Ensure not messing with places from other companies
                      },
                    },
                  },
                  name: event.placeOverride.name,
                  address: {
                    street: event.placeOverride.address.street,
                    city: event.placeOverride.address.city,
                    postalCode: event.placeOverride.address.postalCode,
                    countryCode: event.placeOverride.address.countryCode,
                    subdivision: event.placeOverride.address.subdivision,
                  },
                },
                select: {
                  id: true,
                  address: {
                    select: {
                      id: true,
                    },
                  },
                },
              });

              if (existingPlace) {
                eventPlace = {
                  id: existingPlace.id,
                  name: event.placeOverride.name,
                  address: {
                    id: existingPlace.address.id,
                    ...event.placeOverride.address,
                  },
                };
              } else {
                // We create them directly so on the upcoming event place search it may be reused
                const createdEventPlace = await tx.place.create({
                  data: {
                    name: event.placeOverride.name,
                    address: {
                      create: {
                        street: event.placeOverride.address.street,
                        city: event.placeOverride.address.city,
                        postalCode: event.placeOverride.address.postalCode,
                        countryCode: event.placeOverride.address.countryCode,
                        subdivision: event.placeOverride.address.subdivision,
                      },
                    },
                  },
                  select: {
                    id: true,
                    address: {
                      select: {
                        id: true,
                      },
                    },
                  },
                });

                eventPlace = {
                  id: createdEventPlace.id,
                  name: event.placeOverride.name,
                  address: {
                    id: createdEventPlace.address.id,
                    ...event.placeOverride.address,
                  },
                };
              }
            }

            // In case the user has just defined specific places for each representation instead of using a default place
            // we promote the first one as default to be sure validation for each organism it will work since we expect a default to simplify validation/usage
            // Note: no need to promote other overrides like audience... since they are not optional in the database
            if (defaultPlace === null && eventPlace !== null) {
              defaultPlace = eventPlace;

              // The event place is no longer an override in this case
              eventPlace = null;
            }
          }

          // If ticketing data has been modified we set a boolean so they won't be overriden on the next synchronization
          const storedEvent = eventSerie.Event.find((eSE) => eSE.id === event.id);

          assert(storedEvent);

          const storedLiteFlattenEvent: Pick<
            EventSchemaType,
            'ticketingRevenueIncludingTaxes' | 'ticketingRevenueExcludingTaxes' | 'freeTickets' | 'paidTickets'
          > &
            Pick<EventSerieSchemaType, 'ticketingRevenueTaxRate'> = {
            ticketingRevenueIncludingTaxes: storedEvent.ticketingRevenueIncludingTaxes.toNumber(),
            ticketingRevenueExcludingTaxes: storedEvent.ticketingRevenueExcludingTaxes.toNumber(),
            ticketingRevenueTaxRate: (storedEvent.ticketingRevenueTaxRateOverride ?? eventSerie.ticketingRevenueTaxRate).toNumber(),
            freeTickets: storedEvent.freeTickets,
            paidTickets: storedEvent.paidTickets,
          };

          const inputLiteFlattenEvent: typeof storedLiteFlattenEvent = {
            ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes,
            ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes,
            ticketingRevenueTaxRate: event.ticketingRevenueTaxRateOverride ?? agnosticDeclaration.eventSerie.ticketingRevenueTaxRate,
            freeTickets: event.freeTickets,
            paidTickets: event.paidTickets,
          };

          const eventDifferences = diff(storedLiteFlattenEvent, inputLiteFlattenEvent);
          const eventTicketingDataToBecomeImmutable = eventDifferences.length > 0;

          await tx.event.update({
            where: {
              id: event.id,
              eventSerieId: eventSerie.id, // Ensure scope
            },
            data: {
              startAt: event.startAt,
              endAt: event.endAt,
              ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes,
              ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes,
              // ticketingRevenueDefinedTaxRate: event.ticketingRevenueDefinedTaxRate, // Not used for now
              consumptionsRevenueIncludingTaxes: event.consumptionsRevenueIncludingTaxes,
              consumptionsRevenueExcludingTaxes: event.consumptionsRevenueExcludingTaxes,
              consumptionsRevenueTaxRate: event.consumptionsRevenueTaxRate,
              cateringRevenueIncludingTaxes: event.cateringRevenueIncludingTaxes,
              cateringRevenueExcludingTaxes: event.cateringRevenueExcludingTaxes,
              cateringRevenueTaxRate: event.cateringRevenueTaxRate,
              programSalesRevenueIncludingTaxes: event.programSalesRevenueIncludingTaxes,
              programSalesRevenueExcludingTaxes: event.programSalesRevenueExcludingTaxes,
              programSalesRevenueTaxRate: event.programSalesRevenueTaxRate,
              otherRevenueIncludingTaxes: event.otherRevenueIncludingTaxes,
              otherRevenueExcludingTaxes: event.otherRevenueExcludingTaxes,
              otherRevenueTaxRate: event.otherRevenueTaxRate,
              freeTickets: event.freeTickets,
              paidTickets: event.paidTickets,
              placeOverrideId: eventPlace?.id ?? null,
              // For override values, set them null if they equal the default ones
              placeCapacityOverride:
                event.placeCapacityOverride === agnosticDeclaration.eventSerie.placeCapacity ? null : event.placeCapacityOverride,
              audienceOverride: event.audienceOverride === agnosticDeclaration.eventSerie.audience ? null : event.audienceOverride,
              ticketingRevenueTaxRateOverride:
                event.ticketingRevenueTaxRateOverride === agnosticDeclaration.eventSerie.ticketingRevenueTaxRate
                  ? null
                  : event.ticketingRevenueTaxRateOverride,
              lastManualTicketingDataUpdateAt: eventTicketingDataToBecomeImmutable ? new Date() : undefined, // If not detected this time keep the previous value to not loose track of manual updates
            },
          });

          eventPlace && newPlacesIds.add(eventPlace.id);
        }

        // Only update organization if properties have been set
        if (
          agnosticDeclaration.organization.sacemId ||
          agnosticDeclaration.organization.sacdId ||
          agnosticDeclaration.organization.sibilUsername ||
          agnosticDeclaration.organization.sibilPassword
        ) {
          await tx.organization.update({
            where: {
              id: eventSerie.ticketingSystem.organization.id,
            },
            data: {
              sacemId: agnosticDeclaration.organization.sacemId ?? undefined,
              sacdId: agnosticDeclaration.organization.sacdId ?? undefined,
              // SIBIL values go by pair due to how is formatted the input object
              sibilUsername: agnosticDeclaration.organization.sibilUsername ?? undefined,
              sibilPassword: agnosticDeclaration.organization.sibilPassword ?? undefined,
            },
          });
        }

        const updatedEventSerie = await tx.eventSerie.update({
          where: {
            id: eventSerie.id,
          },
          data: {
            producerOfficialId: agnosticDeclaration.eventSerie.producerOfficialId,
            producerName: agnosticDeclaration.eventSerie.producerName,
            performanceType: agnosticDeclaration.eventSerie.performanceType,
            expectedDeclarationTypes: agnosticDeclaration.eventSerie.expectedDeclarationTypes,
            placeId: defaultPlace?.id ?? null,
            placeCapacity: agnosticDeclaration.eventSerie.placeCapacity,
            audience: agnosticDeclaration.eventSerie.audience,
            ticketingRevenueTaxRate: agnosticDeclaration.eventSerie.ticketingRevenueTaxRate,
            expensesIncludingTaxes: agnosticDeclaration.eventSerie.expensesIncludingTaxes,
            expensesExcludingTaxes: agnosticDeclaration.eventSerie.expensesExcludingTaxes,
            expensesTaxRate: agnosticDeclaration.eventSerie.expensesTaxRate,
            introductionFeesExpensesIncludingTaxes: agnosticDeclaration.eventSerie.introductionFeesExpensesIncludingTaxes,
            introductionFeesExpensesExcludingTaxes: agnosticDeclaration.eventSerie.introductionFeesExpensesExcludingTaxes,
            introductionFeesExpensesTaxRate: agnosticDeclaration.eventSerie.introductionFeesExpensesTaxRate,
            circusSpecificExpensesIncludingTaxes: agnosticDeclaration.eventSerie.circusSpecificExpensesIncludingTaxes,
            circusSpecificExpensesExcludingTaxes: agnosticDeclaration.eventSerie.circusSpecificExpensesExcludingTaxes,
            circusSpecificExpensesTaxRate: agnosticDeclaration.eventSerie.circusSpecificExpensesTaxRate,
            lastManualUpdateAt: new Date(),
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
                    sibilUsername: true,
                    sibilPassword: true,
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
            AttachmentsOnEventSeries: {
              select: {
                attachmentId: true,
                type: true,
                attachment: {
                  select: {
                    id: true,
                    contentType: true,
                    name: true,
                    size: true,
                  },
                },
              },
            },
          },
        });

        // If some places are no longer used we make sure removing them if not used by other event series
        // Note: since all have been already detached, we can safely consider the following request without ignoring current event serie and events
        const placesIdsDiffResult = getSimpleArraysDiff([...oldPlacesIds.values()], [...newPlacesIds.values()]);
        const sortedPlacesIdsDiffResult = sortSimpleArraysDiff(placesIdsDiffResult);

        if (sortedPlacesIdsDiffResult.removed.length > 0) {
          const placesToRemove = await tx.place.findMany({
            where: {
              id: {
                in: sortedPlacesIdsDiffResult.removed,
              },
              AND: {
                OR: [
                  {
                    EventSerie: {
                      none: {
                        ticketingSystem: {
                          organizationId: eventSerie.ticketingSystem.organization.id,
                        },
                      },
                    },
                  },
                  {
                    Event: {
                      none: {
                        eventSerie: {
                          ticketingSystem: {
                            organizationId: eventSerie.ticketingSystem.organization.id,
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            select: {
              id: true,
            },
          });

          await tx.place.deleteMany({
            where: {
              id: {
                in: placesToRemove.map((pTR) => pTR.id),
              },
            },
          });
        }

        return updatedEventSerie;
      },
      {
        timeout: secondsToMilliseconds(15),
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    // Attachments links must be generated on the fly asynchronously, that's why they are mapped separately than the rest (outside `declarationPrismaToModel()`)
    const attachmentsWithTypes = await Promise.all(
      returnedEventSerie.AttachmentsOnEventSeries.map(async (aOES) => {
        const { id, type } = attachmentOnEventSeriePrismaToModel(aOES);

        return {
          ...(await attachmentPrismaToModel(aOES.attachment)),
          type: type,
        };
      })
    );

    const declarationModel = declarationPrismaToModel(returnedEventSerie);

    return {
      declaration: {
        ...declarationModel,
        eventSerie: {
          ...declarationModel.eventSerie,
          attachments: attachmentsWithTypes,
        },
      } satisfies DeclarationWrapperSchemaType['declaration'],
    };
  }),
});
