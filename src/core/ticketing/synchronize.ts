import { Prisma } from '@prisma/client';
import { min, minutesToMilliseconds, subMonths } from 'date-fns';
import { z } from 'zod';

import { truncateFloatAmountNumber } from '@ad/src/core/declaration';
import { getTicketingSystemClient } from '@ad/src/core/ticketing/instance';
import { anotherTicketingSystemSynchronizationOngoingError, noValidTicketingSystemError } from '@ad/src/models/entities/errors';
import {
  EventSerieSchema,
  LiteEventSchema,
  LiteEventSchemaType,
  LiteEventSerieSchema,
  LiteEventSerieSchemaType,
} from '@ad/src/models/entities/event';
import { prisma } from '@ad/src/prisma/client';
import { assertUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { getDiff, sortDiffWithKeys } from '@ad/src/utils/comparaison';
import { applyTypedParsers } from '@ad/src/utils/zod';

const LiteEventSerieManagingDefaultsSchema = applyTypedParsers(
  LiteEventSerieSchema.extend({
    ticketingRevenueTaxRate: EventSerieSchema.shape.ticketingRevenueTaxRate,
  })
);
export type LiteEventSerieManagingDefaultsSchemaType = z.infer<typeof LiteEventSerieManagingDefaultsSchema>;

const defaultConnectorEventSerieTaxRate = 0.055;

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
      forceNextSynchronizationFrom: true,
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

          // We allow forcing a date not seeable by the user in case of connector fix that should require a resync from an older moment
          // Note: forcing cannot be after the last synchronization because it could miss information
          let newSynchronizationStartingDate: Date;
          if (ticketingSystem.forceNextSynchronizationFrom && ticketingSystem.lastSynchronizationAt) {
            newSynchronizationStartingDate = min([ticketingSystem.lastSynchronizationAt, ticketingSystem.forceNextSynchronizationFrom]);
          } else {
            newSynchronizationStartingDate =
              ticketingSystem.forceNextSynchronizationFrom ?? ticketingSystem.lastSynchronizationAt ?? oldestAllowedDate;
          }

          try {
            const remoteEventsSeries = await ticketingSystemClient.getEventsSeries(newSynchronizationStartingDate);
            const internalEventsSeriesTicketingSystemIdsToConsider = remoteEventsSeries.map(
              (eventsSerie) => eventsSerie.serie.internalTicketingSystemId
            );

            // We do not manage deletions since we fetch last updated events to not flood the third-party
            // Note: it could be possible on a regular basis (7 days?) to also check for events series consistency
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
                ticketingRevenueTaxRate: true,
                lastManualUpdateAt: true,
                Event: {
                  select: {
                    id: true,
                    internalTicketingSystemId: true,
                    startAt: true,
                    endAt: true,
                    ticketingRevenueIncludingTaxes: true,
                    ticketingRevenueExcludingTaxes: true,
                    ticketingRevenueTaxRateOverride: true,
                    freeTickets: true,
                    paidTickets: true,
                    lastManualTicketingDataUpdateAt: true,
                  },
                },
                EventSerieDeclaration: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            });

            // Since uniqueness is for some tables based on values into other tables, we have to keep a map of the ticketing system IDs and our IDs to perform some database mutations
            const eventsSeriesTicketingSystemIdToDatabaseId: Map<string, string> = new Map();
            const eventsTicketingSystemIdToDatabaseId: typeof eventsSeriesTicketingSystemIdToDatabaseId = new Map();

            // Once an event serie transmitted or being transmitted we don't want to override data with synchronization to avoid loosing corrected data and dealing with new event on it that would mess with what has been declared
            const eventsSeriesTicketingSystemIdsToSkip = new Set<string>();
            storedEventsSeries.forEach(
              (sES) => sES.EventSerieDeclaration.length > 0 && eventsSeriesTicketingSystemIdsToSkip.add(sES.internalTicketingSystemId)
            );

            // Once ticketing data is manually patched we don't want to override it with synchronization to avoid loosing corrected data
            // Note: doing at the tinier scope is the best to allow new events from the ticketing system to be synchronized, but also if some are modified despite we only updated the location or so
            const eventsTicketingSystemIdsToSkip = new Set<string>();
            storedEventsSeries.forEach((sES) => {
              sES.Event.forEach((event) => {
                event.lastManualTicketingDataUpdateAt && eventsTicketingSystemIdsToSkip.add(event.internalTicketingSystemId);
              });
            });

            // We perform multiple diffs for each type to be sure processing them easily
            // Because a diff on 2 huge objects would imply understand in depth the returned differences (array order, which sub-subproperty has been modified or created...)
            const storedLiteEventsSeries = new Map<LiteEventSerieSchemaType['internalTicketingSystemId'], LiteEventSerieManagingDefaultsSchemaType>();
            const remoteLiteEventsSeries: typeof storedLiteEventsSeries = new Map();

            const storedLiteEvents = new Map<
              LiteEventSchemaType['internalTicketingSystemId'],
              LiteEventSchemaType & {
                internalEventSerieTicketingSystemId: LiteEventSerieSchemaType['internalTicketingSystemId'];
              }
            >();
            const remoteLiteEvents: typeof storedLiteEvents = new Map();

            // Format all from stored entities
            for (const storedEventsSerie of storedEventsSeries) {
              if (eventsSeriesTicketingSystemIdsToSkip.has(storedEventsSerie.internalTicketingSystemId)) {
                continue;
              }

              eventsSeriesTicketingSystemIdToDatabaseId.set(storedEventsSerie.internalTicketingSystemId, storedEventsSerie.id);

              // To make the diff we compare only meaningful properties
              storedLiteEventsSeries.set(
                storedEventsSerie.internalTicketingSystemId,
                LiteEventSerieManagingDefaultsSchema.parse({
                  internalTicketingSystemId: storedEventsSerie.internalTicketingSystemId,
                  name: storedEventsSerie.name,
                  ticketingRevenueTaxRate: storedEventsSerie.ticketingRevenueTaxRate.toNumber(),
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
                    ticketingRevenueIncludingTaxes: storedEvent.ticketingRevenueIncludingTaxes.toNumber(),
                    ticketingRevenueExcludingTaxes: storedEvent.ticketingRevenueExcludingTaxes.toNumber(),
                    ticketingRevenueTaxRate: storedEvent.ticketingRevenueTaxRateOverride
                      ? storedEvent.ticketingRevenueTaxRateOverride.toNumber()
                      : null,
                    freeTickets: storedEvent.freeTickets,
                    paidTickets: storedEvent.paidTickets,
                  }),
                });
              }
            }

            // Format all from remote entities
            for (const remoteEventsSerieWrapper of remoteEventsSeries) {
              if (eventsSeriesTicketingSystemIdsToSkip.has(remoteEventsSerieWrapper.serie.internalTicketingSystemId)) {
                continue;
              }

              // For consistency in our logic we assume a default tax rate and force `null` on event if same value
              remoteLiteEventsSeries.set(remoteEventsSerieWrapper.serie.internalTicketingSystemId, {
                ...remoteEventsSerieWrapper.serie,
                ticketingRevenueTaxRate: defaultConnectorEventSerieTaxRate,
              });

              for (const remoteEventWrapper of remoteEventsSerieWrapper.events) {
                let ticketingRevenueTaxRate: number | null;

                // Since `null` is considered as not overriden in database, when receiving `null` from the connector we assume it's 0%
                ticketingRevenueTaxRate = remoteEventWrapper.ticketingRevenueTaxRate ?? 0;

                remoteLiteEvents.set(remoteEventWrapper.internalTicketingSystemId, {
                  internalEventSerieTicketingSystemId: remoteEventsSerieWrapper.serie.internalTicketingSystemId,
                  ...remoteEventWrapper,
                  ticketingRevenueTaxRate: ticketingRevenueTaxRate === defaultConnectorEventSerieTaxRate ? null : ticketingRevenueTaxRate,
                  // Make sure of 2 decimals for the comparaison to be right since they are stored like that in database
                  ticketingRevenueExcludingTaxes: truncateFloatAmountNumber(remoteEventWrapper.ticketingRevenueExcludingTaxes),
                  ticketingRevenueIncludingTaxes: truncateFloatAmountNumber(remoteEventWrapper.ticketingRevenueIncludingTaxes),
                });
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
                producerOfficialId: null,
                producerName: null,
                performanceType: null,
                expectedDeclarationTypes: [],
                lastManualUpdateAt: null,
                placeId: null,
                placeCapacity: null,
                audience: 'ALL',
                ticketingRevenueTaxRate: addedEventSerie.model.ticketingRevenueTaxRate,
                expensesIncludingTaxes: 0,
                expensesExcludingTaxes: 0,
                introductionFeesExpensesIncludingTaxes: 0,
                introductionFeesExpensesExcludingTaxes: 0,
                circusSpecificExpensesIncludingTaxes: null,
                circusSpecificExpensesExcludingTaxes: null,
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
                  ticketingRevenueTaxRate: updatedEventSerie.model.ticketingRevenueTaxRate,
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
                  ticketingRevenueIncludingTaxes: addedEvent.model.ticketingRevenueIncludingTaxes,
                  ticketingRevenueExcludingTaxes: addedEvent.model.ticketingRevenueExcludingTaxes,
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
                  freeTickets: addedEvent.model.freeTickets,
                  paidTickets: addedEvent.model.paidTickets,
                  placeOverrideId: undefined,
                  placeCapacityOverride: null,
                  audienceOverride: null,
                  ticketingRevenueTaxRateOverride: addedEvent.model.ticketingRevenueTaxRate,
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

              const eventTicketingDataImmutableNow = eventsTicketingSystemIdsToSkip.has(updatedEvent.model.internalTicketingSystemId);

              if (!eventTicketingDataImmutableNow) {
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
                    ticketingRevenueIncludingTaxes: updatedEvent.model.ticketingRevenueIncludingTaxes,
                    ticketingRevenueExcludingTaxes: updatedEvent.model.ticketingRevenueExcludingTaxes,
                    ticketingRevenueTaxRateOverride: updatedEvent.model.ticketingRevenueTaxRate,
                    freeTickets: updatedEvent.model.freeTickets,
                    paidTickets: updatedEvent.model.paidTickets,
                  },
                });
              }
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

            // Store this synchronization date to only fetch the differences next time
            await tx.ticketingSystem.update({
              where: {
                id: ticketingSystem.id,
              },
              data: {
                lastSynchronizationAt: currentSynchronizationStartingDate,
                forceNextSynchronizationFrom: null,
              },
            });
          } catch (error) {
            if (error instanceof Error) {
              // Keep track of the error, not using database because the transaction will be canceled
              await prisma.ticketingSystem.update({
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
