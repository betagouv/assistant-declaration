import { EventCategoryTickets } from '@prisma/client';

import {
  GetEventSerieSchema,
  ListEventsSchema,
  ListEventsSeriesSchema,
  SynchronizeDataFromTicketingSystemsSchema,
  UpdateEventCategoryTicketsSchema,
} from '@ad/src/models/actions/event';
import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
import {
  collaboratorCanOnlySeeOrganizationEventsSeriesError,
  eventCategoryTicketsNotFoundError,
  eventSerieNotFoundError,
  organizationCollaboratorRoleRequiredError,
} from '@ad/src/models/entities/errors';
import { EventSerieWrapperSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { prisma } from '@ad/src/prisma/client';
import {
  declarationTypePrismaToModel,
  eventCategoryTicketsPrismaToModel,
  eventPrismaToModel,
  eventSeriePrismaToModel,
  ticketCategoryPrismaToModel,
} from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization, isUserACollaboratorPartOfOrganizations } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';

export const eventRouter = router({
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
