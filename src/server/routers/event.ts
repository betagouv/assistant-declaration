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
        EventSerieDeclaration: true,
        Event: {
          select: {
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
          };
        })
        .sort((a, b) => +b.computedEndAt - +a.computedEndAt),
    };
  }),
  addEventSerie: privateProcedure.input(AddEventSerieSchema).mutation(async ({ ctx, input }) => {
    await prisma.$transaction(
      async (tx) => {
        const ticketingSystem = await tx.ticketingSystem.findUnique({
          where: {
            id: input.ticketingSystemId,
            deletedAt: null, // Ensure it's still valid... maybe to change if events series are still visible once the system is deleted?
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

        if (!ticketingSystem) {
          throw ticketingSystemNotFoundError;
        } else if (!(await isUserACollaboratorPartOfOrganization(ticketingSystem.organization.id, ctx.user.id))) {
          throw organizationCollaboratorRoleRequiredError;
        } else if (ticketingSystem.name !== 'MANUAL') {
          throw new Error('only event serie manually added can be updated');
        }

        await tx.eventSerie.create({
          data: {
            // We reuse default values we could have from a creation during a synchronization
            internalTicketingSystemId: Date.now().toString(), // Since needing a unique ID we chose to use the milliseconds timestamp (since not parallelization it won't be an issue across users)
            ticketingSystemId: ticketingSystem.id,
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
                data: input.events.map((addedEvent) => ({
                  internalTicketingSystemId: Date.now().toString(), // Since needing a unique ID we chose to use the milliseconds timestamp (since not parallelization it won't be an issue across users)
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
                })),
                skipDuplicates: true,
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
          await tx.event.createMany({
            data: sortedEventsDiffResult.added.map((addedEvent) => ({
              internalTicketingSystemId: Date.now().toString(), // Since needing a unique ID we chose to use the milliseconds timestamp (since not parallelization it won't be an issue across users)
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
            })),
            skipDuplicates: true,
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
