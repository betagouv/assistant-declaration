import { Prisma } from '@prisma/client';
import { secondsToMilliseconds } from 'date-fns';

import { defaultConnectorEventSerieTaxRate } from '@ad/src/core/ticketing/synchronize';
import { AddEventSerieSchema, ListEventsSeriesSchema, RemoveEventSerieSchema, UpdateEventSerieSchema } from '@ad/src/models/actions/event';
import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
import {
  collaboratorCanOnlySeeOrganizationEventsSeriesError,
  eventSerieNotFoundError,
  organizationCollaboratorRoleRequiredError,
  ticketingSystemNotFoundError,
} from '@ad/src/models/entities/errors';
import { EventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { prisma } from '@ad/src/prisma/client';
import { declarationTypePrismaToModel, eventSeriePrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization, isUserACollaboratorPartOfOrganizations } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';
import { getDiff, sortDiffWithKeys } from '@ad/src/utils/comparaison';

export const eventRouter = router({
  listEventsSeries: privateProcedure.input(ListEventsSeriesSchema).query(async ({ ctx, input }) => {
    if (
      !input.filterBy.organizationIds ||
      input.filterBy.organizationIds.length !== 1 ||
      !(await isUserACollaboratorPartOfOrganizations(input.filterBy.organizationIds, ctx.user.id))
    ) {
      throw collaboratorCanOnlySeeOrganizationEventsSeriesError;
    }

    const eventsSeries = await prisma.eventSerie.findMany({
      where: {
        ticketingSystem: {
          organizationId: input.filterBy.organizationIds
            ? {
                in: input.filterBy.organizationIds,
              }
            : undefined,
        },
      },
      include: {
        ticketingSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        EventSerieDeclaration: true,
        Event: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
          },
          orderBy: {
            startAt: 'asc',
          },
        },
        AttachmentsOnEventSeries: true,
      },
    });

    return {
      eventsSeriesWrappers: eventsSeries
        .map((eventsSerie): EventSerieWrapperSchemaType => {
          // Fallback to old dates since it should not happen often
          const computedStartAt = eventsSerie.Event.length > 0 ? eventsSerie.Event[0].startAt : new Date(0);
          const computedEndAt =
            eventsSerie.Event.length > 0
              ? eventsSerie.Event[eventsSerie.Event.length - 1].endAt ?? eventsSerie.Event[eventsSerie.Event.length - 1].startAt
              : new Date(0);

          return {
            serie: eventSeriePrismaToModel(eventsSerie),
            computedStartAt: computedStartAt,
            computedEndAt: computedEndAt,
            place: null, // TODO: to remove?
            partialDeclarations: eventsSerie.EventSerieDeclaration.map((declaration) => {
              return {
                type: declarationTypePrismaToModel(declaration.type),
                status: DeclarationStatusSchema.parse(declaration.status),
                transmittedAt: declaration.transmittedAt,
              };
            }),
            partialEvents: eventsSerie.Event.map((event) => {
              return {
                id: event.id,
                startAt: event.startAt,
                endAt: event.endAt,
              };
            }),
            ticketingSystemName: eventsSerie.ticketingSystem.name,
          };
        })
        .sort((a, b) => +b.computedEndAt - +a.computedEndAt),
    };
  }),
  addEventSerie: privateProcedure.input(AddEventSerieSchema).mutation(async ({ ctx, input }) => {
    await prisma.$transaction(
      async (tx) => {
        // If the ticketing system is not specified we assume the user wants to use the manual one
        // Note: at the user creation we do not create it automatically, so it has to be done here if needed
        const ticketingSystem = await tx.ticketingSystem.findFirst({
          where: {
            deletedAt: null, // Ensure it's still valid... maybe to change if events series are still visible once the system is deleted?
            AND: input.ticketingSystemId
              ? {
                  id: input.ticketingSystemId,
                }
              : {
                  name: 'MANUAL',
                  organizationId: input.organizationId,
                },
          },
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
              },
            },
          },
        });

        let ticketingSystemId: string;

        if (ticketingSystem) {
          if (!(await isUserACollaboratorPartOfOrganization(ticketingSystem.organization.id, ctx.user.id))) {
            throw organizationCollaboratorRoleRequiredError;
          } else if (ticketingSystem.name !== 'MANUAL') {
            throw new Error('only event serie manually added can be updated');
          }

          ticketingSystemId = ticketingSystem.id;
        } else {
          if (!input.ticketingSystemId) {
            if (!(await isUserACollaboratorPartOfOrganization(input.organizationId, ctx.user.id))) {
              throw organizationCollaboratorRoleRequiredError;
            }

            const manualTicketingSystem = await tx.ticketingSystem.create({
              data: {
                organizationId: input.organizationId,
                name: 'MANUAL',
                apiAccessKey: null,
                apiSecretKey: null,
              },
            });

            ticketingSystemId = manualTicketingSystem.id;
          } else {
            throw ticketingSystemNotFoundError;
          }
        }

        // Since needing a unique ID we chose to use the milliseconds timestamp (since not parallelization it won't be an issue across users)
        // We increment for any new event to have them unique (it should not collide with a concurrent request)
        const firstUniqueInternalTicketingSystemId = Date.now();

        await tx.eventSerie.create({
          data: {
            // We reuse default values we could have from a creation during a synchronization
            internalTicketingSystemId: Date.now().toString(), // Since needing a unique ID we chose to use the milliseconds timestamp (since not parallelization it won't be an issue across users)
            ticketingSystemId: ticketingSystemId,
            name: input.name,
            producerOfficialId: null,
            producerName: null,
            performanceType: null,
            expectedDeclarationTypes: [],
            lastManualUpdateAt: null,
            placeId: null,
            placeCapacity: null,
            audience: 'ALL',
            ticketingRevenueTaxRate: defaultConnectorEventSerieTaxRate,
            expensesIncludingTaxes: 0,
            expensesExcludingTaxes: 0,
            introductionFeesExpensesIncludingTaxes: 0,
            introductionFeesExpensesExcludingTaxes: 0,
            circusSpecificExpensesIncludingTaxes: null,
            circusSpecificExpensesExcludingTaxes: null,
            Event: {
              createMany: {
                data: input.events.map((addedEvent, addedEventIndex) => {
                  return {
                    internalTicketingSystemId: (firstUniqueInternalTicketingSystemId + addedEventIndex).toString(),
                    startAt: addedEvent.startAt,
                    endAt: addedEvent.endAt,
                    ticketingRevenueIncludingTaxes: 0,
                    ticketingRevenueExcludingTaxes: 0,
                    ticketingRevenueDefinedTaxRate: false, // For now we disable the usage of tax rate as a coefficient (both amounts must be provided)
                    consumptionsRevenueIncludingTaxes: 0,
                    consumptionsRevenueExcludingTaxes: 0,
                    consumptionsRevenueTaxRate: null,
                    cateringRevenueIncludingTaxes: 0,
                    cateringRevenueExcludingTaxes: 0,
                    cateringRevenueTaxRate: null,
                    programSalesRevenueIncludingTaxes: 0,
                    programSalesRevenueExcludingTaxes: 0,
                    programSalesRevenueTaxRate: null,
                    otherRevenueIncludingTaxes: 0,
                    otherRevenueExcludingTaxes: 0,
                    otherRevenueTaxRate: null,
                    freeTickets: 0,
                    paidTickets: 0,
                    placeOverrideId: undefined,
                    placeCapacityOverride: null,
                    audienceOverride: null,
                    ticketingRevenueTaxRateOverride: null,
                  };
                }),
                skipDuplicates: false,
              },
            },
          },
        });
      },
      {
        timeout: secondsToMilliseconds(15),
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return;
  }),
  updateEventSerie: privateProcedure.input(UpdateEventSerieSchema).mutation(async ({ ctx, input }) => {
    await prisma.$transaction(
      async (tx) => {
        const eventSerie = await tx.eventSerie.findUnique({
          where: {
            id: input.eventSerieId,
          },
          select: {
            id: true,
            ticketingSystem: {
              select: {
                name: true,
                organization: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            Event: {
              select: {
                id: true,
                startAt: true,
                endAt: true,
              },
            },
            EventSerieDeclaration: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!eventSerie) {
          throw eventSerieNotFoundError;
        } else if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, ctx.user.id))) {
          throw organizationCollaboratorRoleRequiredError;
        } else if (eventSerie.ticketingSystem.name !== 'MANUAL') {
          throw new Error('only event serie manually added can be updated');
        } else if (eventSerie.EventSerieDeclaration.length > 0) {
          throw new Error('event serie not updatable since it has already been in the process of declaration');
        }

        const existingLiteEvents = new Map<string, { startAt: Date; endAt: Date | null }>();
        const nextLiteEvents: typeof existingLiteEvents = new Map();

        eventSerie.Event.forEach((event) =>
          existingLiteEvents.set(event.id, {
            startAt: event.startAt,
            endAt: event.endAt,
          })
        );

        let newIdIncrement = 0;
        input.events.forEach((event) =>
          nextLiteEvents.set(
            event.id ?? `new_${++newIdIncrement}`, // ID does not matter, it just needs to be non existing for the comparaison
            {
              startAt: event.startAt,
              endAt: event.endAt,
            }
          )
        );

        const eventsDiffResult = getDiff(existingLiteEvents, nextLiteEvents);
        const sortedEventsDiffResult = sortDiffWithKeys(eventsDiffResult);

        if (sortedEventsDiffResult.added.length > 0) {
          // Since needing a unique ID we chose to use the milliseconds timestamp (since not parallelization it won't be an issue across users)
          // We increment for any new event to have them unique (it should not collide with a concurrent request)
          const firstUniqueInternalTicketingSystemId = Date.now();

          await tx.event.createMany({
            data: sortedEventsDiffResult.added.map((addedEvent, addedEventIndex) => {
              return {
                internalTicketingSystemId: (firstUniqueInternalTicketingSystemId + addedEventIndex).toString(),
                eventSerieId: eventSerie.id,
                startAt: addedEvent.model.startAt,
                endAt: addedEvent.model.endAt,
                ticketingRevenueIncludingTaxes: 0,
                ticketingRevenueExcludingTaxes: 0,
                ticketingRevenueDefinedTaxRate: false, // For now we disable the usage of tax rate as a coefficient (both amounts must be provided)
                consumptionsRevenueIncludingTaxes: 0,
                consumptionsRevenueExcludingTaxes: 0,
                consumptionsRevenueTaxRate: null,
                cateringRevenueIncludingTaxes: 0,
                cateringRevenueExcludingTaxes: 0,
                cateringRevenueTaxRate: null,
                programSalesRevenueIncludingTaxes: 0,
                programSalesRevenueExcludingTaxes: 0,
                programSalesRevenueTaxRate: null,
                otherRevenueIncludingTaxes: 0,
                otherRevenueExcludingTaxes: 0,
                otherRevenueTaxRate: null,
                freeTickets: 0,
                paidTickets: 0,
                placeOverrideId: undefined,
                placeCapacityOverride: null,
                audienceOverride: null,
                ticketingRevenueTaxRateOverride: null,
              };
            }),
            skipDuplicates: false,
          });
        }

        if (sortedEventsDiffResult.updated.length > 0) {
          for (const updatedEvent of sortedEventsDiffResult.updated) {
            await tx.event.update({
              where: {
                id: updatedEvent.key,
                eventSerieId: eventSerie.id, // Ensure not messing with places from other companies
              },
              data: {
                startAt: updatedEvent.model.startAt,
                endAt: updatedEvent.model.endAt,
              },
            });
          }
        }

        if (sortedEventsDiffResult.removed.length > 0) {
          await tx.event.deleteMany({
            where: {
              id: {
                in: sortedEventsDiffResult.removed.map((removedEvent) => removedEvent.key),
              },
              eventSerieId: eventSerie.id, // Ensure not messing with places from other companies
            },
          });
        }

        await tx.eventSerie.update({
          where: {
            id: eventSerie.id,
          },
          data: {
            name: input.name,
          },
        });
      },
      {
        timeout: secondsToMilliseconds(15),
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return;
  }),
  removeEventSerie: privateProcedure.input(RemoveEventSerieSchema).mutation(async ({ ctx, input }) => {
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
      },
      select: {
        id: true,
        ticketingSystem: {
          select: {
            name: true,
            organization: {
              select: {
                id: true,
              },
            },
          },
        },
        EventSerieDeclaration: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!eventSerie) {
      throw eventSerieNotFoundError;
    } else if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    } else if (eventSerie.ticketingSystem.name !== 'MANUAL') {
      throw new Error('only event serie manually added can be removed');
    } else if (eventSerie.EventSerieDeclaration.length > 0) {
      throw new Error('event serie not deletable since it has already been in the process of declaration');
    }

    // Events are deleted thanks to the on cascade
    await prisma.eventSerie.delete({
      where: {
        id: eventSerie.id,
      },
    });

    return;
  }),
});
