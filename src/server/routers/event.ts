import { EventCategoryTickets, Prisma } from '@prisma/client';
import { minutesToMilliseconds, subMonths } from 'date-fns';

import {
  BilletwebTicketingSystemClient,
  MapadoTicketingSystemClient,
  MockTicketingSystemClient,
  TicketingSystemClient,
} from '@ad/src/core/ticketing';
import {
  GetEventSerieSchema,
  ListEventsSchema,
  ListEventsSeriesSchema,
  SynchronizeDataFromTicketingSystemsSchema,
  UpdateEventCategoryTicketsSchema,
} from '@ad/src/models/actions/event';
import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
import {
  anotherTicketingSystemSynchronizationOngoingError,
  collaboratorCanOnlySeeOrganizationEventsSeriesError,
  eventCategoryTicketsNotFoundError,
  eventSerieNotFoundError,
  noValidTicketingSystemError,
  organizationCollaboratorRoleRequiredError,
} from '@ad/src/models/entities/errors';
import {
  EventSerieWrapperSchemaType,
  EventWrapperSchemaType,
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
import {
  declarationTypePrismaToModel,
  eventCategoryTicketsPrismaToModel,
  eventPrismaToModel,
  eventSeriePrismaToModel,
  ticketCategoryPrismaToModel,
} from '@ad/src/server/routers/mappers';
import {
  assertUserACollaboratorPartOfOrganization,
  isUserACollaboratorPartOfOrganization,
  isUserACollaboratorPartOfOrganizations,
} from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { getDiff } from '@ad/src/utils/comparaison';

export const eventRouter = router({
  synchronizeDataFromTicketingSystems: privateProcedure.input(SynchronizeDataFromTicketingSystemsSchema).mutation(async ({ ctx, input }) => {
    await assertUserACollaboratorPartOfOrganization(input.organizationId, ctx.user.id);

    const oldestAllowedDate = subMonths(new Date(), 13); // Consider omitting comparing old events (they are considered not modifiable now)

    const ticketingSystems = await prisma.ticketingSystem.findMany({
      where: {
        organizationId: input.organizationId,
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
        >`SELECT pg_try_advisory_xact_lock(hashtext('ticketing_systems_synchronization_${input.organizationId}'));`;

        if (lockResult[0].pg_try_advisory_xact_lock !== true) {
          throw anotherTicketingSystemSynchronizationOngoingError;
        }

        // Iterate over each system
        await Promise.all(
          ticketingSystems.map(async (ticketingSystem) => {
            let ticketingSystemClient: TicketingSystemClient;

            if (
              process.env.APP_MODE !== 'prod' &&
              (!process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS ||
                !process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS.split(',').includes(ctx.user.id))
            ) {
              ticketingSystemClient = new MockTicketingSystemClient();
            } else {
              switch (ticketingSystem.name) {
                case 'BILLETWEB':
                  assert(ticketingSystem.apiAccessKey);
                  assert(ticketingSystem.apiSecretKey);

                  ticketingSystemClient = new BilletwebTicketingSystemClient(ticketingSystem.apiAccessKey, ticketingSystem.apiSecretKey);
                  break;
                case 'MAPADO':
                  assert(ticketingSystem.apiSecretKey);

                  ticketingSystemClient = new MapadoTicketingSystemClient(ticketingSystem.apiSecretKey);
                  break;
                default:
                  throw new Error('unknown ticketing system');
              }
            }

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

              const newEventsSeries = await tx.eventSerie.createManyAndReturn({
                data: eventsSeriesDiffResult.added.map((addedEventSerie) => ({
                  internalTicketingSystemId: addedEventSerie.internalTicketingSystemId,
                  ticketingSystemId: ticketingSystem.id,
                  name: addedEventSerie.name,
                  startAt: addedEventSerie.startAt,
                  endAt: addedEventSerie.endAt,
                  taxRate: addedEventSerie.taxRate,
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

              for (const updatedEventSerie of eventsSeriesDiffResult.updated) {
                await tx.eventSerie.update({
                  where: {
                    ticketingSystemId_internalTicketingSystemId: {
                      internalTicketingSystemId: updatedEventSerie.internalTicketingSystemId,
                      ticketingSystemId: ticketingSystem.id,
                    },
                  },
                  data: {
                    name: updatedEventSerie.name,
                    startAt: updatedEventSerie.startAt,
                    endAt: updatedEventSerie.endAt,
                    taxRate: updatedEventSerie.taxRate,
                  },
                });
              }

              // Then make the diff of events sales
              const eventSalesDiffResult = getDiff(storedLiteEventSales, remoteLiteEventSales);

              // We set the bindings removal at top of operations because it would fail if the removal is due to an associated entity being deleted (due to the `onDelete` of the database)
              // (we cannot only on the database `onDelete` since a binding can be removed without affecting associated entities, we have to keep this removal loop)
              for (const removedEventSales of eventSalesDiffResult.removed) {
                const eventId = eventsTicketingSystemIdToDatabaseId.get(removedEventSales.internalEventTicketingSystemId);
                const categoryId = ticketCategoriesTicketingSystemIdToDatabaseId.get(removedEventSales.internalTicketCategoryTicketingSystemId);

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

              for (const addedTicketCategory of ticketCategoriesDiffResult.added) {
                const newTicketCategory = await tx.ticketCategory.create({
                  data: {
                    internalTicketingSystemId: addedTicketCategory.internalTicketingSystemId,
                    eventSerie: {
                      connect: {
                        ticketingSystemId_internalTicketingSystemId: {
                          internalTicketingSystemId: addedTicketCategory.internalEventSerieTicketingSystemId,
                          ticketingSystemId: ticketingSystem.id,
                        },
                      },
                    },
                    name: addedTicketCategory.name,
                    description: addedTicketCategory.description,
                    price: addedTicketCategory.price,
                  },
                  select: {
                    id: true,
                    internalTicketingSystemId: true,
                  },
                });

                // Update the mappings only for creation
                ticketCategoriesTicketingSystemIdToDatabaseId.set(newTicketCategory.internalTicketingSystemId, newTicketCategory.id);
              }

              for (const updatedTicketCategory of ticketCategoriesDiffResult.updated) {
                const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(updatedTicketCategory.internalEventSerieTicketingSystemId);

                assert(eventSerieId);

                await tx.ticketCategory.update({
                  where: {
                    eventSerieId_internalTicketingSystemId: {
                      internalTicketingSystemId: updatedTicketCategory.internalTicketingSystemId,
                      eventSerieId: eventSerieId,
                    },
                  },
                  data: {
                    name: updatedTicketCategory.name,
                    description: updatedTicketCategory.description,
                    price: updatedTicketCategory.price,
                  },
                });
              }

              for (const removedTicketCategory of ticketCategoriesDiffResult.removed) {
                const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(removedTicketCategory.internalEventSerieTicketingSystemId);

                assert(eventSerieId);

                await tx.ticketCategory.delete({
                  where: {
                    eventSerieId_internalTicketingSystemId: {
                      internalTicketingSystemId: removedTicketCategory.internalTicketingSystemId,
                      eventSerieId: eventSerieId,
                    },
                  },
                });
              }

              // Then make the diff of events (we are sure they are bound to an event serie due to returned serie wrappers)
              const eventsDiffResult = getDiff(storedLiteEvents, remoteLiteEvents);

              for (const addedEvent of eventsDiffResult.added) {
                const newEvent = await tx.event.create({
                  data: {
                    internalTicketingSystemId: addedEvent.internalTicketingSystemId,
                    eventSerie: {
                      connect: {
                        ticketingSystemId_internalTicketingSystemId: {
                          internalTicketingSystemId: addedEvent.internalEventSerieTicketingSystemId,
                          ticketingSystemId: ticketingSystem.id,
                        },
                      },
                    },
                    startAt: addedEvent.startAt,
                    endAt: addedEvent.endAt,
                  },
                  select: {
                    id: true,
                    internalTicketingSystemId: true,
                  },
                });

                // Update the mappings only for creation
                eventsTicketingSystemIdToDatabaseId.set(newEvent.internalTicketingSystemId, newEvent.id);
              }

              for (const updatedEvent of eventsDiffResult.updated) {
                const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(updatedEvent.internalEventSerieTicketingSystemId);

                assert(eventSerieId);

                await tx.event.update({
                  where: {
                    eventSerieId_internalTicketingSystemId: {
                      internalTicketingSystemId: updatedEvent.internalTicketingSystemId,
                      eventSerieId: eventSerieId,
                    },
                  },
                  data: {
                    startAt: updatedEvent.startAt,
                    endAt: updatedEvent.endAt,
                  },
                });
              }

              for (const removedEvent of eventsDiffResult.removed) {
                const eventSerieId = eventsSeriesTicketingSystemIdToDatabaseId.get(removedEvent.internalEventSerieTicketingSystemId);

                assert(eventSerieId);

                await tx.event.delete({
                  where: {
                    eventSerieId_internalTicketingSystemId: {
                      internalTicketingSystemId: removedEvent.internalTicketingSystemId,
                      eventSerieId: eventSerieId,
                    },
                  },
                });
              }

              for (const addedEventSales of eventSalesDiffResult.added) {
                const eventId = eventsTicketingSystemIdToDatabaseId.get(addedEventSales.internalEventTicketingSystemId);
                const categoryId = ticketCategoriesTicketingSystemIdToDatabaseId.get(addedEventSales.internalTicketCategoryTicketingSystemId);

                assert(eventId);
                assert(categoryId);

                await tx.eventCategoryTickets.create({
                  data: {
                    total: addedEventSales.total,
                    totalOverride: null,
                    priceOverride: null,
                    eventId: eventId,
                    categoryId: categoryId,
                  },
                });
              }

              for (const updatedEventSales of eventSalesDiffResult.updated) {
                const eventId = eventsTicketingSystemIdToDatabaseId.get(updatedEventSales.internalEventTicketingSystemId);
                const categoryId = ticketCategoriesTicketingSystemIdToDatabaseId.get(updatedEventSales.internalTicketCategoryTicketingSystemId);

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
                    total: updatedEventSales.total,
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
  }),
  getEventSerie: privateProcedure.input(GetEventSerieSchema).query(async ({ ctx, input }) => {
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.id,
      },
      include: {
        EventSerieDeclaration: {
          include: {
            EventSerieSacdDeclaration: {
              select: {
                id: true,
              },
            },
            EventSerieSacemDeclaration: {
              select: {
                id: true,
              },
            },
          },
        },
        ticketingSystem: {
          select: {
            organizationId: true,
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

    return {
      eventSerie: eventSeriePrismaToModel(eventSerie),
    };
  }),
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
        EventSerieDeclaration: {
          include: {
            EventSerieSacdDeclaration: {
              select: {
                id: true,
              },
            },
            EventSerieSacemDeclaration: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        startAt: 'desc',
      },
    });

    return {
      eventsSeriesWrappers: eventsSeries.map((eventsSerie): EventSerieWrapperSchemaType => {
        return {
          serie: eventSeriePrismaToModel(eventsSerie),
          partialDeclarations: eventsSerie.EventSerieDeclaration.map((declaration) => {
            return {
              type: declarationTypePrismaToModel(declaration),
              status: DeclarationStatusSchema.parse(declaration.status),
            };
          }),
        };
      }),
    };
  }),
  listEvents: privateProcedure.input(ListEventsSchema).query(async ({ ctx, input }) => {
    const eventSerieId = input.filterBy.eventSeriesIds ? input.filterBy.eventSeriesIds[0] : ''; // For now, requires exactly 1 case

    const targetedSerie = await prisma.eventSerie.findUniqueOrThrow({
      where: {
        id: eventSerieId,
      },
      select: {
        id: true,
        ticketingSystem: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!(await isUserACollaboratorPartOfOrganization(targetedSerie.ticketingSystem.organizationId, ctx.user.id))) {
      throw organizationCollaboratorRoleRequiredError;
    }

    const ticketCategories = await prisma.ticketCategory.findMany({
      where: {
        eventSerieId: targetedSerie.id,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const events = await prisma.event.findMany({
      where: {
        eventSerieId: targetedSerie.id,
      },
      include: {
        EventCategoryTickets: true,
      },
      orderBy: {
        startAt: 'desc',
      },
    });

    // Since in database we only have `EventCategoryTickets` entries when the ticketing system has them
    // We have to add "fake null ones" for those not existing so it's consistent for the user (and to allow him to modify values)
    return {
      eventsWrappers: events.map((event): EventWrapperSchemaType => {
        return {
          event: eventPrismaToModel(event),
          sales: ticketCategories.map((ticketCategory) => {
            const eventCategoryTickets = event.EventCategoryTickets.find(
              (eventCategoryTickets) => eventCategoryTickets.categoryId === ticketCategory.id
            );

            return {
              ticketCategory: ticketCategoryPrismaToModel(ticketCategory),
              eventCategoryTickets: eventCategoryTickets
                ? eventCategoryTicketsPrismaToModel(eventCategoryTickets)
                : {
                    id: `not_existing_${event.id}_${ticketCategory.id}`, // Still make it unique for the frontend
                    eventId: event.id,
                    categoryId: ticketCategory.id,
                    total: 0,
                    totalOverride: null,
                    priceOverride: null,
                    createdAt: ticketCategory.createdAt,
                    updatedAt: ticketCategory.updatedAt,
                  },
            };
          }),
        };
      }),
    };
  }),
  updateEventCategoryTickets: privateProcedure.input(UpdateEventCategoryTicketsSchema).mutation(async ({ ctx, input }) => {
    // Since we return virtual entries to always make sure to list all categories on the frontend despite no sale
    // We have to take care of the user overriding an entry not yet existing
    let updatedEventCategoryTickets: EventCategoryTickets;

    if (typeof input.eventCategoryTicketsId === 'string') {
      const eventCategoryTickets = await prisma.eventCategoryTickets.findUnique({
        where: {
          id: input.eventCategoryTicketsId,
        },
        select: {
          id: true,
          event: {
            select: {
              eventSerie: {
                select: {
                  ticketingSystem: {
                    select: {
                      organizationId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!eventCategoryTickets) {
        throw eventCategoryTicketsNotFoundError;
      }

      // Before returning, make sure the caller has rights on this authority ;)
      if (!(await isUserACollaboratorPartOfOrganization(eventCategoryTickets.event.eventSerie.ticketingSystem.organizationId, ctx.user.id))) {
        throw organizationCollaboratorRoleRequiredError;
      }

      updatedEventCategoryTickets = await prisma.eventCategoryTickets.update({
        where: {
          id: eventCategoryTickets.id,
        },
        data: {
          totalOverride: input.totalOverride,
          priceOverride: input.priceOverride,
        },
      });
    } else {
      const eventSerie = await prisma.eventSerie.findFirst({
        where: {
          Event: {
            some: {
              id: input.eventCategoryTicketsId.eventId,
            },
          },
          TicketCategory: {
            some: {
              id: input.eventCategoryTicketsId.categoryId,
            },
          },
        },
        select: {
          ticketingSystem: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      if (!eventSerie) {
        throw eventCategoryTicketsNotFoundError;
      }

      // Before returning, make sure the caller has rights on this authority ;)
      if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organizationId, ctx.user.id))) {
        throw organizationCollaboratorRoleRequiredError;
      }

      // We make sure there is not an existing entry for this event and category
      // because the user may have tried without the unique ID
      const existingEventCategoryTickets = await prisma.eventCategoryTickets.findFirst({
        where: {
          eventId: input.eventCategoryTicketsId.eventId,
          categoryId: input.eventCategoryTicketsId.categoryId,
        },
        select: {
          id: true,
        },
      });

      if (existingEventCategoryTickets) {
        updatedEventCategoryTickets = await prisma.eventCategoryTickets.update({
          where: {
            id: existingEventCategoryTickets.id,
          },
          data: {
            totalOverride: input.totalOverride,
            priceOverride: input.priceOverride,
          },
        });
      } else {
        updatedEventCategoryTickets = await prisma.eventCategoryTickets.create({
          data: {
            eventId: input.eventCategoryTicketsId.eventId,
            categoryId: input.eventCategoryTicketsId.categoryId,
            total: 0, // Since not existing we set 0 as default value
            totalOverride: input.totalOverride,
            priceOverride: input.priceOverride,
          },
        });
      }
    }

    return {
      eventCategoryTickets: eventCategoryTicketsPrismaToModel(updatedEventCategoryTickets),
    };
  }),
});
