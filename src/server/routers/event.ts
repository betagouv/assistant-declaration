import { AddEventSerieSchema, ListEventsSeriesSchema, RemoveEventSerieSchema, UpdateEventSerieSchema } from '@ad/src/models/actions/event';
import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
import {
  collaboratorCanOnlySeeOrganizationEventsSeriesError,
  eventSerieNotFoundError,
  organizationCollaboratorRoleRequiredError,
} from '@ad/src/models/entities/errors';
import { EventSerieWrapperSchemaType } from '@ad/src/models/entities/event';
import { prisma } from '@ad/src/prisma/client';
import { declarationTypePrismaToModel, eventSeriePrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization, isUserACollaboratorPartOfOrganizations } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';

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
    return undefined;
  }),
  updateEventSerie: privateProcedure.input(UpdateEventSerieSchema).mutation(async ({ ctx, input }) => {
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
        Event: {
          select: {
            id: true,
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

    await prisma.eventSerie.update({});

    await prisma.eventSerie.update({
      where: {
        id: eventSerie.id,
      },
      data: {
        name: input.name,
      },
    });

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
