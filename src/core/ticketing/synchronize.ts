import { Prisma } from '@prisma/client';
import { minutesToMilliseconds, subMonths } from 'date-fns';

import { getTicketingSystemClient } from '@ad/src/core/ticketing/instance';
import { anotherTicketingSystemSynchronizationOngoingError, noValidTicketingSystemError } from '@ad/src/models/entities/errors';
import {
  LiteEventSalesSchema,
  LiteEventSalesSchemaType,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieSchemaType,
  LiteTicketCategorySchema,
  LiteTicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import { prisma } from '@ad/src/prisma/client';
import { assertUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { getDiff, sortDiffWithKeys } from '@ad/src/utils/comparaison';

export async function synchronizeDataFromTicketingSystems(organizationId: string, userId: string): Promise<void> {
  await assertUserACollaboratorPartOfOrganization(organizationId, userId);

  const oldestAllowedDate = subMonths(new Date(), 13); // Consider omitting comparing old events (they are considered not modifiable now)

  const ticketingSystems = await prisma.ticketingSystem.findMany({
    where: {
      organizationId: organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      apiAccessKey: true,
      apiSecretKey: true,
      lastSynchronizationAt: true,
    },
  });

  if (ticketingSystems.length === 0) {
    throw noValidTicketingSystemError;
  }

  // We record a starting date before fetching data to be sure next time we are not missing mutations
  const currentSynchronizationStartingDate = new Date();

  // We use an explicit transaction to allow using a lock to prevent multiple synchronization triggers at the same time (it would mess with data)
  // Notes:
  // - `pg_try_advisory_xact_lock` won't stack, it fails if any other process ongoing, and it automatically releases at the end of the transaction
  // - a high timeout is needed since fetching data from third-parties
  await prisma.$transaction(
    async (tx) => {
      const lockResult = await tx.$queryRaw<
        [{ pg_try_advisory_xact_lock: boolean }]
      >`SELECT pg_try_advisory_xact_lock(hashtext('ticketing_systems_synchronization_${organizationId}'));`;

      if (lockResult[0].pg_try_advisory_xact_lock !== true) {
        throw anotherTicketingSystemSynchronizationOngoingError;
      }

      // Iterate over each system
      await Promise.all(
        ticketingSystems.map(async (ticketingSystem) => {
          const ticketingSystemClient = getTicketingSystemClient(ticketingSystem, userId);
          const newSynchronizationStartingDate = ticketingSystem.lastSynchronizationAt || oldestAllowedDate;

          try {
            const remoteEventsSeries = await ticketingSystemClient.getEventsSeries(newSynchronizationStartingDate);
            const internalEventsSeriesTicketingSystemIdsToConsider = remoteEventsSeries.map(
              (eventsSerie) => eventsSerie.serie.internalTicketingSystemId
            );

            // We do not manage deletions since we fetch get last updated events to not flood the third-party
            // It could be possible on a regular basis (7 days?) to also check for events series consistency
            const storedEventsSeries = await tx.eventSerie.findMany({
              where: {
                internalTicketingSystemId: {
                  in: internalEventsSeriesTicketingSystemIdsToConsider,
                },
                ticketingSystem: {
                  // Just to make sure it's isolated for uniqueness of their IDs across ticketing systems
                  // and to check it cannot affect the wrong organization if the remote data is wrong
                  //
                  // Before we were just checking `id === ticketingSystem.id` but it's risky in case a ticketing system has been deleted and recreated
                  // We have no way to now the unicity since `apiAccessKey` can be null and the `apiAccessSecret` may vary if regenerated
                  // So to simplify our logic we take all series from the same organization for this ticketing system since we do not remove those already created
                  // It makes the process safe
                  organizationId: ticketingSystem.organizationId,
                  name: ticketingSystem.name,
                },
              },
              select: {
                id: true,
                internalTicketingSystemId: true,
                name: true,
                startAt: true,
                endAt: true,
                taxRate: true,
                Event: {
                  select: {
                    id: true,
                    internalTicketingSystemId: true,
                    startAt: true,
                    endAt: true,
                    EventCategoryTickets: {
                      select: {
                        id: true,
                        total: true,
                        totalOverride: true,
                        priceOverride: true,
                        categoryId: true,
                      },
                    },
                  },
                },
                TicketCategory: {
                  select: {
                    id: true,
                    internalTicketingSystemId: true,
                    name: true,
                    description: true,
                    price: true,
                  },
                },
              },
            });

            // Since uniqueness is for some tables based on values into other tables, we have to keep a map of the ticketing system IDs and our IDs to perform some database mutations
            const eventsSeriesTicketingSystemIdToDatabaseId: Map<string, string> = new Map();
            const eventsTicketingSystemIdToDatabaseId: typeof eventsSeriesTicketingSystemIdToDatabaseId = new Map();
            const ticketCategoriesTicketingSystemIdToDatabaseId: typeof eventsSeriesTicketingSystemIdToDatabaseId = new Map();

            // We perform multiple diffs for each type to be sure processing them easily
            // Because a diff on 2 huge objects would imply understand in depth the returned differences (array order, which sub-subproperty has been modified or created...)
            const storedLiteEventsSeries = new Map<LiteEventSerieSchemaType['internalTicketingSystemId'], LiteEventSerieSchemaType>();
            const remoteLiteEventsSeries: typeof storedLiteEventsSeries = new Map();

            const storedLiteTicketCategories = new Map<
              LiteTicketCategorySchemaType['internalTicketingSystemId'],
              LiteTicketCategorySchemaType & {
                internalEventSerieTicketingSystemId: LiteEventSerieSchemaType['internalTicketingSystemId'];
              }
            >();
            const remoteLiteTicketCategories: typeof storedLiteTicketCategories = new Map();

            const storedLiteEvents = new Map<
              LiteEventSchemaType['internalTicketingSystemId'],
              LiteEventSchemaType & {
                internalEventSerieTicketingSystemId: LiteEventSerieSchemaType['internalTicketingSystemId'];
              }
            >();
            const remoteLiteEvents: typeof storedLiteEvents = new Map();

            const storedLiteEventSales = new Map<
              LiteEventSalesSchemaType['internalEventTicketingSystemId'] & LiteEventSalesSchemaType['internalTicketCategoryTicketingSystemId'],
              LiteEventSalesSchemaType
            >();
            const remoteLiteEventSales: typeof storedLiteEventSales = new Map();

            // Format all from stored entities
            for (const storedEventsSerie of storedEventsSeries) {
              eventsSeriesTicketingSystemIdToDatabaseId.set(storedEventsSerie.internalTicketingSystemId, storedEventsSerie.id);

              // To make the diff we compare only meaningful properties
              storedLiteEventsSeries.set(
                storedEventsSerie.internalTicketingSystemId,
                LiteEventSerieSchema.parse({
                  internalTicketingSystemId: storedEventsSerie.internalTicketingSystemId,
                  name: storedEventsSerie.name,
                  startAt: storedEventsSerie.startAt,
                  endAt: storedEventsSerie.endAt,
                  taxRate: storedEventsSerie.taxRate.toNumber(),
                })
              );

              for (const storedEvent of storedEventsSerie.Event) {
                eventsTicketingSystemIdToDatabaseId.set(storedEvent.internalTicketingSystemId, storedEvent.id);

                storedLiteEvents.set(storedEvent.internalTicketingSystemId, {
                  internalEventSerieTicketingSystemId: storedEventsSerie.internalTicketingSystemId,
                  ...LiteEventSchema.parse({
                    internalTicketingSystemId: storedEvent.internalTicketingSystemId,
                    startAt: storedEvent.startAt,
                    endAt: storedEvent.endAt,
                  }),
                });

                for (const storedEventCategoryTickets of storedEvent.EventCategoryTickets) {
                  const storedTicketCategory = storedEventsSerie.TicketCategory.find((tC) => tC.id === storedEventCategoryTickets.categoryId);

                  assert(storedTicketCategory);

                  storedLiteEventSales.set(
                    `${storedEvent.internalTicketingSystemId}_${storedTicketCategory.internalTicketingSystemId}`, // Concatenation for uniqueness
                    LiteEventSalesSchema.parse({
                      internalEventTicketingSystemId: storedEvent.internalTicketingSystemId,
                      internalTicketCategoryTicketingSystemId: storedTicketCategory.internalTicketingSystemId,
                      total: storedEventCategoryTickets.total,
                    })
                  );
                }
              }

              for (const storedTicketCategory of storedEventsSerie.TicketCategory) {
                ticketCategoriesTicketingSystemIdToDatabaseId.set(storedTicketCategory.internalTicketingSystemId, storedTicketCategory.id);

                storedLiteTicketCategories.set(storedTicketCategory.internalTicketingSystemId, {
                  internalEventSerieTicketingSystemId: storedEventsSerie.internalTicketingSystemId,
                  ...LiteTicketCategorySchema.parse({
                    internalTicketingSystemId: storedTicketCategory.internalTicketingSystemId,
                    name: storedTicketCategory.name,
                    description: storedTicketCategory.description,
                    price: storedTicketCategory.price.toNumber(),
                  }),
                });
              }
            }

            // Format all from remote entities
            for (const remoteEventsSerieWrapper of remoteEventsSeries) {
              remoteLiteEventsSeries.set(remoteEventsSerieWrapper.serie.internalTicketingSystemId, remoteEventsSerieWrapper.serie);

              for (const remoteTicketCategory of remoteEventsSerieWrapper.ticketCategories) {
                remoteLiteTicketCategories.set(remoteTicketCategory.internalTicketingSystemId, {
                  internalEventSerieTicketingSystemId: remoteEventsSerieWrapper.serie.internalTicketingSystemId,
                  ...remoteTicketCategory,
                });
              }

              for (const remoteEventWrapper of remoteEventsSerieWrapper.events) {
                remoteLiteEvents.set(remoteEventWrapper.internalTicketingSystemId, {
                  internalEventSerieTicketingSystemId: remoteEventsSerieWrapper.serie.internalTicketingSystemId,
                  ...remoteEventWrapper,
                });
              }

              for (const remoteEventSales of remoteEventsSerieWrapper.sales) {
                remoteLiteEventSales.set(
                  `${remoteEventSales.internalEventTicketingSystemId}_${remoteEventSales.internalTicketCategoryTicketingSystemId}`, // Concatenation for uniqueness
                  remoteEventSales
                );
              }
            }

            // We won't consider removing events series that may not be fetched due to a slight shift in the query parameters from both side
            // but we will for all "subentites" like events, categories and sales
            const eventsSeriesDiffResult = getDiff(storedLiteEventsSeries, remoteLiteEventsSeries);
            const sortedEventsSeriesDiffResult = sortDiffWithKeys(eventsSeriesDiffResult);

            const newEventsSeries = await tx.eventSerie.createManyAndReturn({
              data: sortedEventsSeriesDiffResult.added.map((addedEventSerie) => ({
                internalTicketingSystemId: addedEventSerie.model.internalTicketingSystemId,
                ticketingSystemId: ticketingSystem.id,
                name: addedEventSerie.model.name,
                startAt: addedEventSerie.model.startAt,
                endAt: addedEventSerie.model.endAt,
                taxRate: addedEventSerie.model.taxRate,
              })),
              skipDuplicates: true,
              select: {
                id: true,
                internalTicketingSystemId: true,
              },
            });

            // Update the mappings only for creation
            newEventsSeries.forEach((newEventsSerie) =>
              eventsSeriesTicketingSystemIdToDatabaseId.set(newEventsSerie.internalTicketingSystemId, newEventsSerie.id)
            );

            for (const updatedEventSerie of sortedEventsSeriesDiffResult.updated) {
              await tx.eventSerie.update({
                where: {
                  ticketingSystemId_internalTicketingSystemId: {
                    internalTicketingSystemId: updatedEventSerie.model.internalTicketingSystemId,
                    ticketingSystemId: ticketingSystem.id,
                  },
                },
                data: {
                  name: updatedEventSerie.model.name,
                  startAt: updatedEventSerie.model.startAt,
                  endAt: updatedEventSerie.model.endAt,
                  taxRate: updatedEventSerie.model.taxRate,
                },
              });
            }

            // Then make the diff of events sales
            const eventSalesDiffResult = getDiff(storedLiteEventSales, remoteLiteEventSales);
            const sortedEventSalesDiffResult = sortDiffWithKeys(eventSalesDiffResult);

            // We set the bindings removal at top of operations because it would fail if the removal is due to an associated entity being deleted (due to the `onDelete` of the database)
            // (we cannot only on the database `onDelete` since a binding can be removed without affecting associated entities, we have to keep this removal loop)
            for (const removedEventSales of sortedEventSalesDiffResult.removed) {
              const eventId = eventsTicketingSystemIdToDatabaseId.get(removedEventSales.model.internalEventTicketingSystemId);
              const categoryId = ticketCategoriesTicketingSystemIdToDatabaseId.get(removedEventSales.model.internalTicketCategoryTicketingSystemId);

              assert(eventId, 'dddddddd');
              assert(categoryId, 'eeeee');

              await tx.eventCategoryTickets.delete({
                where: {
                  eventId_categoryId: {
                    eventId: eventId,
                    categoryId: categoryId,
                  },
                },
              });
            }

            // Then make the diff of tickets categories (we are sure they are bound to an event serie due to returned serie wrappers)
            const ticketCategoriesDiffResult = getDiff(storedLiteTicketCategories, remoteLiteTicketCategories);
            const sortedTicketCategoriesDiffResult = sortDiffWithKeys(ticketCategoriesDiffResult);

            for (const addedTicketCategory of sortedTicketCategoriesDiffResult.added) {
              const newTicketCategory = await tx.ticketCategory.create({
                data: {
                  internalTicketingSystemId: addedTicketCategory.model.internalTicketingSystemId,
                  eventSerie: {
                    connect: {
                      ticketingSystemId_internalTicketingSystemId: {
                        internalTicketingSystemId: addedTicketCategory.model.internalEventSerieTicketingSystemId,
                        ticketingSystemId: ticketingSystem.id,
                      },
                    },
                  },
                  name: addedTicketCategory.model.name,
                  description: addedTicketCategory.model.description,
                  price: addedTicketCategory.model.price,
                },
                select: {
                  id: true,
                  internalTicketingSystemId: true,
                },
              });

              // Update the mappings only for creation
              ticketCategoriesTicketingSystemIdToDatabaseId.set(newTicketCategory.internalTicketingSystemId, newTicketCategory.id);
            }

            for (const updatedTicketCategory of sortedTicketCategoriesDiffResult.updated) {
              const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(updatedTicketCategory.model.internalEventSerieTicketingSystemId);

              assert(eventSerieId);

              await tx.ticketCategory.update({
                where: {
                  eventSerieId_internalTicketingSystemId: {
                    internalTicketingSystemId: updatedTicketCategory.model.internalTicketingSystemId,
                    eventSerieId: eventSerieId,
                  },
                },
                data: {
                  name: updatedTicketCategory.model.name,
                  description: updatedTicketCategory.model.description,
                  price: updatedTicketCategory.model.price,
                },
              });
            }

            for (const removedTicketCategory of sortedTicketCategoriesDiffResult.removed) {
              const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(removedTicketCategory.model.internalEventSerieTicketingSystemId);

              assert(eventSerieId);

              await tx.ticketCategory.delete({
                where: {
                  eventSerieId_internalTicketingSystemId: {
                    internalTicketingSystemId: removedTicketCategory.model.internalTicketingSystemId,
                    eventSerieId: eventSerieId,
                  },
                },
              });
            }

            // Then make the diff of events (we are sure they are bound to an event serie due to returned serie wrappers)
            const eventsDiffResult = getDiff(storedLiteEvents, remoteLiteEvents);
            const sortedEventsDiffResult = sortDiffWithKeys(eventsDiffResult);

            for (const addedEvent of sortedEventsDiffResult.added) {
              const newEvent = await tx.event.create({
                data: {
                  internalTicketingSystemId: addedEvent.model.internalTicketingSystemId,
                  eventSerie: {
                    connect: {
                      ticketingSystemId_internalTicketingSystemId: {
                        internalTicketingSystemId: addedEvent.model.internalEventSerieTicketingSystemId,
                        ticketingSystemId: ticketingSystem.id,
                      },
                    },
                  },
                  startAt: addedEvent.model.startAt,
                  endAt: addedEvent.model.endAt,
                },
                select: {
                  id: true,
                  internalTicketingSystemId: true,
                },
              });

              // Update the mappings only for creation
              eventsTicketingSystemIdToDatabaseId.set(newEvent.internalTicketingSystemId, newEvent.id);
            }

            for (const updatedEvent of sortedEventsDiffResult.updated) {
              const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(updatedEvent.model.internalEventSerieTicketingSystemId);

              assert(eventSerieId);

              await tx.event.update({
                where: {
                  eventSerieId_internalTicketingSystemId: {
                    internalTicketingSystemId: updatedEvent.model.internalTicketingSystemId,
                    eventSerieId: eventSerieId,
                  },
                },
                data: {
                  startAt: updatedEvent.model.startAt,
                  endAt: updatedEvent.model.endAt,
                },
              });
            }

            for (const removedEvent of sortedEventsDiffResult.removed) {
              const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(removedEvent.model.internalEventSerieTicketingSystemId);

              assert(eventSerieId);

              await tx.event.delete({
                where: {
                  eventSerieId_internalTicketingSystemId: {
                    internalTicketingSystemId: removedEvent.model.internalTicketingSystemId,
                    eventSerieId: eventSerieId,
                  },
                },
              });
            }

            for (const addedEventSales of sortedEventSalesDiffResult.added) {
              const eventId = eventsTicketingSystemIdToDatabaseId.get(addedEventSales.model.internalEventTicketingSystemId);
              const categoryId = ticketCategoriesTicketingSystemIdToDatabaseId.get(addedEventSales.model.internalTicketCategoryTicketingSystemId);

              assert(eventId);
              assert(categoryId);

              await tx.eventCategoryTickets.create({
                data: {
                  total: addedEventSales.model.total,
                  totalOverride: null,
                  priceOverride: null,
                  eventId: eventId,
                  categoryId: categoryId,
                },
              });
            }

            for (const updatedEventSales of sortedEventSalesDiffResult.updated) {
              const eventId = eventsTicketingSystemIdToDatabaseId.get(updatedEventSales.model.internalEventTicketingSystemId);
              const categoryId = ticketCategoriesTicketingSystemIdToDatabaseId.get(updatedEventSales.model.internalTicketCategoryTicketingSystemId);

              assert(eventId);
              assert(categoryId);

              await tx.eventCategoryTickets.update({
                where: {
                  eventId_categoryId: {
                    eventId: eventId,
                    categoryId: categoryId,
                  },
                },
                data: {
                  total: updatedEventSales.model.total,
                },
              });
            }

            // Store this synchronization date to only fetch the differences next time
            await tx.ticketingSystem.update({
              where: {
                id: ticketingSystem.id,
              },
              data: {
                lastSynchronizationAt: currentSynchronizationStartingDate,
              },
            });
          } catch (error) {
            if (error instanceof Error) {
              // Keep track of the error
              await tx.ticketingSystem.update({
                where: {
                  id: ticketingSystem.id,
                },
                data: {
                  lastProcessingError: error.message,
                  lastProcessingErrorAt: new Date(),
                },
              });
            }

            throw error;
          }
        })
      );
    },
    {
      timeout: minutesToMilliseconds(10), // Synchronizing with third-parties may take some time
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );
}
