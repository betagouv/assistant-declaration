import { EventSerieDeclarationStatus } from '@prisma/client';
import { renderToBuffer } from '@react-pdf/renderer';
import slugify from '@sindresorhus/slugify';

import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { getSacdClient } from '@ad/src/core/declaration/sacd';
import { Attachment as EmailAttachment, mailer } from '@ad/src/emails/mailer';
import { FillDeclarationSchema, GetDeclarationSchema, TransmitDeclarationSchema } from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { DeclarationSchema, DeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/common';
import { SacdDeclarationSchema, SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { SacemDeclarationSchema, SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
import {
  BusinessError,
  atLeastOneEventToTransmitError,
  eventSerieNotFoundError,
  organizationCollaboratorRoleRequiredError,
  sacemAgencyNotFoundError,
  sacemDeclarationUnsuccessfulError,
  transmittedDeclarationCannotBeUpdatedError,
} from '@ad/src/models/entities/errors';
import { prisma } from '@ad/src/prisma/client';
import { declarationPrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';
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
        expensesExcludingTaxes: true,
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
            placeOverride: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
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
    } else if (agnosticDeclaration.events.length === 0) {
      throw atLeastOneEventToTransmitError;
    }

    for (const [declarationType, declarationToDeclare] of declarationsToDeclare) {
      try {
        if (declarationToDeclare === sacemDeclaration) {
          const eventPlacePostalCode: string = sacemDeclaration.eventSerie.place.id; // TODO: get details

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
        } else if (declarationToDeclare === sacdDeclaration) {
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
        taxRate: true,
        expensesExcludingTaxes: true,
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
            placeOverride: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
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
      producerOfficialId: [],
      producerName: [],
      place: [],
      placeCapacity: [],
    };

    // Fill with unique values
    // Since some are optional we ensure they are not null
    for (const previousDeclaration of previousDeclarations) {
      if (previousDeclaration.producerOfficialId && !placeholder.producerOfficialId.includes(previousDeclaration.producerOfficialId))
        placeholder.producerOfficialId.push(previousDeclaration.producerOfficialId);
      if (previousDeclaration.producerName && !placeholder.producerName.includes(previousDeclaration.producerName))
        placeholder.producerName.push(previousDeclaration.producerName);
      if (previousDeclaration.place && !placeholder.place.find((p) => p.id === previousDeclaration.place!.id))
        placeholder.place.push(previousDeclaration.place);
      if (previousDeclaration.placeCapacity && !placeholder.placeCapacity.includes(previousDeclaration.placeCapacity))
        placeholder.placeCapacity.push(previousDeclaration.placeCapacity);
    }

    return {
      declarationWrapper: {
        declaration: declarationPrismaToModel(eventSerie),
        placeholder: placeholder,
      } satisfies DeclarationWrapperSchemaType,
    };
  }),
  fillDeclaration: privateProcedure.input(FillDeclarationSchema).mutation(async ({ ctx, input }) => {
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
      },
      select: {
        id: true,
        name: true,
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
                headquartersAddress: true,
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
    const agnosticDeclaration = DeclarationSchema.parse({
      organization: {
        id: eventSerie.ticketingSystem.organization.id,
        name: eventSerie.ticketingSystem.organization.name,
        officialId: eventSerie.ticketingSystem.organization.officialId,
        officialHeadquartersId: eventSerie.ticketingSystem.organization.officialHeadquartersId,
        headquartersAddress: eventSerie.ticketingSystem.organization.headquartersAddress,
        sacemId: eventSerie.ticketingSystem.organization.sacemId,
        sacdId: eventSerie.ticketingSystem.organization.sacdId,
      },
      eventSerie: {
        id: eventSerie.id,
        name: eventSerie.name,
        producerOfficialId: input.eventSerie.producerOfficialId,
        producerName: input.eventSerie.producerName,
        performanceType: input.eventSerie.performanceType,
        expectedDeclarationTypes: input.eventSerie.expectedDeclarationTypes,
        place: null, // TODO: need association properly
        placeCapacity: input.eventSerie.placeCapacity,
        audience: input.eventSerie.audience,
        taxRate: input.eventSerie.taxRate,
        expensesExcludingTaxes: input.eventSerie.expensesExcludingTaxes,
      },
      events: input.events.map((event) => {
        return {
          id: event.id,
          startAt: event.startAt,
          endAt: event.endAt,
          ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes,
          ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes,
          ticketingRevenueTaxRate: event.ticketingRevenueTaxRate,
          freeTickets: event.freeTickets,
          paidTickets: event.paidTickets,
          placeOverride: null, // TODO: need association properly
          placeCapacityOverride: event.placeCapacityOverride,
          audienceOverride: event.audienceOverride,
          taxRateOverride: event.taxRateOverride,
        };
      }),
    });

    // TODO:
    // TODO: should we ensure format for each organism?
    // ... to allow users saving the form even if not complete fully
    // TODO:

    // // Then ensure it's correctly fulfilled for each declaration expected
    // for (const declarationType of agnosticDeclaration.eventSerie.expectedDeclarationTypes) {
    //   switch (declarationType) {
    //     case 'SACEM':
    //       SacemDeclarationSchema.parse(agnosticDeclaration);
    //       break;
    //     case 'SACD':
    //       SacdDeclarationSchema.parse(agnosticDeclaration);
    //       break;
    //     default:
    //       throw new Error(`declaration type not handled`);
    //   }
    // }

    // TODO:
    // TODO:
    // TODO: ensure UUID are scoped...
    // TODO: place should be an input (if modified and linked to other, create a new one)
    // TODO:
    // TODO:

    // TODO:
    // TODO:
    // TODO: create place if needed, same for events or their places + update events
    // TODO:

    const updatedEventSerie = await prisma.eventSerie.update({
      where: {
        id: eventSerie.id,
      },
      data: {
        producerOfficialId: input.eventSerie.producerOfficialId,
        producerName: input.eventSerie.producerName,
        performanceType: input.eventSerie.performanceType,
        expectedDeclarationTypes: input.eventSerie.expectedDeclarationTypes,
        placeId: input.eventSerie.placeId,
        placeCapacity: input.eventSerie.placeCapacity,
        audience: input.eventSerie.audience,
        taxRate: input.eventSerie.taxRate,
        expensesExcludingTaxes: input.eventSerie.expensesExcludingTaxes,
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
        expensesExcludingTaxes: true,
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

    return {
      declaration: declarationPrismaToModel(updatedEventSerie),
    };
  }),
});
