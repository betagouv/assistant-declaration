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
        expensesExcludingTaxes: true,
        introductionFeesExpensesExcludingTaxes: true,
        circusSpecificExpensesExcludingTaxes: true,
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
        ticketingRevenueTaxRate: true,
        expensesExcludingTaxes: true,
        introductionFeesExpensesExcludingTaxes: true,
        circusSpecificExpensesExcludingTaxes: true,
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
    const returnedEventSerie = await prisma.$transaction(async (tx) => {
      const eventSerie = await tx.eventSerie.findUnique({
        where: {
          id: input.eventSerieId,
        },
        select: {
          id: true,
          name: true,
          placeId: true,
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
          Event: {
            select: {
              placeOverrideId: true,
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
          producerOfficialId: input.eventSerie.producer?.officialId ?? null,
          producerName: input.eventSerie.producer?.name ?? null,
          performanceType: input.eventSerie.performanceType,
          expectedDeclarationTypes: input.eventSerie.expectedDeclarationTypes,
          place: null, // TODO: need association properly
          placeCapacity: input.eventSerie.placeCapacity,
          audience: input.eventSerie.audience,
          ticketingRevenueTaxRate: input.eventSerie.ticketingRevenueTaxRate,
          expensesExcludingTaxes: input.eventSerie.expensesExcludingTaxes,
          introductionFeesExpensesExcludingTaxes: input.eventSerie.introductionFeesExpensesExcludingTaxes,
          circusSpecificExpensesExcludingTaxes: input.eventSerie.circusSpecificExpensesExcludingTaxes,
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
            placeOverride: null, // TODO: need association properly
            placeCapacityOverride: event.placeCapacityOverride,
            audienceOverride: event.audienceOverride,
            // ticketingRevenueTaxRateOverride: event.ticketingRevenueTaxRateOverride,
            ticketingRevenueTaxRateOverride: null,
          };
        }),
      });

      const oldPlacesIds = new Set<string>();
      const newPlacesIds = new Set<string>();

      eventSerie.placeId && oldPlacesIds.add(eventSerie.placeId);
      eventSerie.Event.forEach((event) => event.placeOverrideId && oldPlacesIds.add(event.placeOverrideId));

      let defaultPlaceId: string | null = null;

      // Only consider it if both values are provided
      if (input.eventSerie.place.name !== null && input.eventSerie.place.address !== null) {
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
            name: input.eventSerie.place.name,
            address: {
              street: input.eventSerie.place.address.street,
              city: input.eventSerie.place.address.city,
              postalCode: input.eventSerie.place.address.postalCode,
              countryCode: input.eventSerie.place.address.countryCode,
              subdivision: input.eventSerie.place.address.subdivision,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingPlace) {
          defaultPlaceId = existingPlace.id;
        } else {
          const defaultPlace = await tx.place.create({
            data: {
              name: input.eventSerie.place.name,
              address: {
                create: {
                  street: input.eventSerie.place.address.street,
                  city: input.eventSerie.place.address.city,
                  postalCode: input.eventSerie.place.address.postalCode,
                  countryCode: input.eventSerie.place.address.countryCode,
                  subdivision: input.eventSerie.place.address.subdivision,
                },
              },
            },
          });

          defaultPlaceId = defaultPlace.id;
        }
      }

      defaultPlaceId && newPlacesIds.add(defaultPlaceId);

      // Do the same for each event, and reuse the default place if same values
      for (const event of input.events) {
        let eventPlaceId: string | null = null; // If none it would reuse the default specified

        if (event.placeOverride.name !== null && event.placeOverride.address !== null) {
          if (
            input.eventSerie.place.name !== null &&
            input.eventSerie.place.address !== null &&
            event.placeOverride.name === input.eventSerie.place.name &&
            event.placeOverride.address.street === input.eventSerie.place.address.street &&
            event.placeOverride.address.city === input.eventSerie.place.address.city &&
            event.placeOverride.address.postalCode === input.eventSerie.place.address.postalCode &&
            event.placeOverride.address.countryCode === input.eventSerie.place.address.countryCode &&
            event.placeOverride.address.subdivision === input.eventSerie.place.address.subdivision
          ) {
            eventPlaceId = defaultPlaceId;
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
              },
            });

            if (existingPlace) {
              eventPlaceId = existingPlace.id;
            } else {
              // We create them directly so on the upcoming event place search it may be reused
              const eventPlace = await tx.place.create({
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
              });

              eventPlaceId = eventPlace.id;
            }
          }
        }

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
            placeOverrideId: eventPlaceId,
            // For override values, set them null if they equal the default ones
            placeCapacityOverride: event.placeCapacityOverride === agnosticDeclaration.eventSerie.placeCapacity ? null : event.placeCapacityOverride,
            audienceOverride: event.audienceOverride === agnosticDeclaration.eventSerie.audience ? null : event.audienceOverride,
            ticketingRevenueTaxRateOverride:
              event.ticketingRevenueTaxRateOverride === agnosticDeclaration.eventSerie.ticketingRevenueTaxRate
                ? null
                : event.ticketingRevenueTaxRateOverride,
          },
        });

        eventPlaceId && newPlacesIds.add(eventPlaceId);
      }

      // If some places are no longer used we make sure removing them if not used by other event series
      const placesIdsDiffResult = getSimpleArraysDiff([...oldPlacesIds.values()], [...newPlacesIds.values()]);
      const sortedPlacesIdsDiffResult = sortSimpleArraysDiff(placesIdsDiffResult);

      for (const removedPlaceId of sortedPlacesIdsDiffResult.removed) {
        if (oldPlaceId !== defaultPlaceId && defaultPlaceId !== null) {
          const count = await tx.place.count({
            where: {
              // TODO:
              // TODO:
              // TODO:
              // TODO:
            },
          });
        }
      }

      // TODO: it should be an arrays of old places depending on events too...
      // TODO: if no default place... maybe consider the one from the first event? maybe not... since it can be avoided

      // TODO: SacdDeclarationSchema does not allow null place... how to do it in the case of not providing it, promite one :/ ?
      // because it's allowed for agnostic declaration... it should be handled or we are fine?
      // it may be weird forcing the default whereas the user did not set it up...

      const updatedEventSerie = await tx.eventSerie.update({
        where: {
          id: eventSerie.id,
        },
        data: {
          producerOfficialId: agnosticDeclaration.eventSerie.producerOfficialId,
          producerName: agnosticDeclaration.eventSerie.producerName,
          performanceType: agnosticDeclaration.eventSerie.performanceType,
          expectedDeclarationTypes: agnosticDeclaration.eventSerie.expectedDeclarationTypes,
          placeCapacity: agnosticDeclaration.eventSerie.placeCapacity,
          audience: agnosticDeclaration.eventSerie.audience,
          ticketingRevenueTaxRate: agnosticDeclaration.eventSerie.ticketingRevenueTaxRate,
          expensesExcludingTaxes: agnosticDeclaration.eventSerie.expensesExcludingTaxes,
          introductionFeesExpensesExcludingTaxes: agnosticDeclaration.eventSerie.introductionFeesExpensesExcludingTaxes,
          circusSpecificExpensesExcludingTaxes: agnosticDeclaration.eventSerie.circusSpecificExpensesExcludingTaxes,
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
          expensesExcludingTaxes: true,
          introductionFeesExpensesExcludingTaxes: true,
          circusSpecificExpensesExcludingTaxes: true,
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

      return updatedEventSerie;
    });

    return {
      declaration: declarationPrismaToModel(returnedEventSerie),
    };
  }),
});
