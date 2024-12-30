import { EventSerieDeclarationStatus } from '@prisma/client';

import { FillSacemDeclarationSchema, GetSacemDeclarationSchema } from '@ad/src/models/actions/declaration';
import { SacemDeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration';
import { eventSerieNotFoundError, organizationCollaboratorRoleRequiredError } from '@ad/src/models/entities/errors';
import { prisma } from '@ad/src/prisma/client';
import { sacemDeclarationPrismaToModel, sacemPlaceholderDeclarationPrismaToModel } from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { privateProcedure, router } from '@ad/src/server/trpc';

export const declarationRouter = router({
  getSacemDeclaration: privateProcedure.input(GetSacemDeclarationSchema).query(async ({ ctx, input }) => {
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
      },
      select: {
        id: true,
        name: true,
        startAt: true,
        endAt: true,
        ticketingSystem: {
          select: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        EventSerieDeclaration: {
          select: {
            id: true,
            EventSerieSacemDeclaration: {
              select: {
                id: true,
                clientId: true,
                placeName: true,
                placeCapacity: true,
                managerName: true,
                managerTitle: true,
              },
            },
          },
        },
        Event: {
          select: {
            EventCategoryTickets: {
              select: {
                total: true,
                totalOverride: true,
                priceOverride: true,
                category: {
                  select: {
                    price: true,
                  },
                },
              },
            },
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
    const previousDeclarations = await prisma.eventSerieSacemDeclaration.findMany({
      where: {
        eventSerieDeclaration: {
          eventSerie: {
            ticketingSystem: {
              organizationId: eventSerie.ticketingSystem.organization.id,
            },
          },
        },
      },
      distinct: ['clientId', 'placeName', 'placeCapacity', 'managerName', 'managerTitle'], // At least the distinct may remove duplicates for the whole chain
      // Get only a few of the last declarations since it should representative
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    const placeholder: SacemDeclarationWrapperSchemaType['placeholder'] = {
      ...sacemPlaceholderDeclarationPrismaToModel(eventSerie),
      clientId: [],
      placeName: [],
      placeCapacity: [],
      managerName: [],
      managerTitle: [],
    };

    // Fill with unique values
    for (const previousDeclaration of previousDeclarations) {
      if (!placeholder.clientId.includes(previousDeclaration.clientId)) placeholder.clientId.push(previousDeclaration.clientId);
      if (!placeholder.placeName.includes(previousDeclaration.clientId)) placeholder.placeName.push(previousDeclaration.placeName);
      if (!placeholder.placeCapacity.includes(previousDeclaration.placeCapacity)) placeholder.placeCapacity.push(previousDeclaration.placeCapacity);
      if (!placeholder.managerName.includes(previousDeclaration.managerName)) placeholder.managerName.push(previousDeclaration.managerName);
      if (!placeholder.managerTitle.includes(previousDeclaration.managerTitle)) placeholder.managerTitle.push(previousDeclaration.managerTitle);
    }

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

    // Note: the generated properties calculation is done 2 times but we are fine with that for now
    return {
      sacemDeclarationWrapper: {
        declaration: existingDeclaration ? sacemDeclarationPrismaToModel(eventSerie, existingDeclaration.EventSerieSacemDeclaration!) : null,
        placeholder: placeholder,
      } satisfies SacemDeclarationWrapperSchemaType,
    };
  }),
  fillSacemDeclaration: privateProcedure.input(FillSacemDeclarationSchema).mutation(async ({ ctx, input }) => {
    const eventSerie = await prisma.eventSerie.findUnique({
      where: {
        id: input.eventSerieId,
      },
      select: {
        id: true,
        ticketingSystem: {
          select: {
            organizationId: true,
          },
        },
        EventSerieDeclaration: {
          select: {
            id: true,
            EventSerieSacemDeclaration: {
              select: {
                id: true,
              },
            },
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

    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

    // We have to handle both update and creation since it's implicitely linked to an event serie
    // [WORKAROUND] `upsert` cannot be used to `where` not accepting undefined values (the zero UUID could be a bit at risk so using `create+update`)
    // Ref: https://github.com/prisma/prisma/issues/5233
    let sacemDeclaration;

    if (existingDeclaration) {
      sacemDeclaration = await prisma.eventSerieSacemDeclaration.update({
        where: {
          id: existingDeclaration.EventSerieSacemDeclaration!.id,
        },
        data: {
          clientId: input.clientId,
          placeName: input.placeName,
          placeCapacity: input.placeCapacity,
          managerName: input.managerName,
          managerTitle: input.managerTitle,
        },
        select: {
          id: true,
          clientId: true,
          placeName: true,
          placeCapacity: true,
          managerName: true,
          managerTitle: true,
          eventSerieDeclaration: {
            select: {
              id: true,
              eventSerie: {
                select: {
                  id: true,
                  name: true,
                  startAt: true,
                  endAt: true,
                  ticketingSystem: {
                    select: {
                      organization: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                  Event: {
                    select: {
                      EventCategoryTickets: {
                        select: {
                          total: true,
                          totalOverride: true,
                          priceOverride: true,
                          category: {
                            select: {
                              price: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      sacemDeclaration = await prisma.eventSerieSacemDeclaration.create({
        data: {
          clientId: input.clientId,
          placeName: input.placeName,
          placeCapacity: input.placeCapacity,
          managerName: input.managerName,
          managerTitle: input.managerTitle,
          eventSerieDeclaration: {
            create: {
              status: EventSerieDeclarationStatus.PENDING,
              eventSerieId: eventSerie.id,
            },
          },
        },
        select: {
          id: true,
          clientId: true,
          placeName: true,
          placeCapacity: true,
          managerName: true,
          managerTitle: true,
          eventSerieDeclaration: {
            select: {
              id: true,
              eventSerie: {
                select: {
                  id: true,
                  name: true,
                  startAt: true,
                  endAt: true,
                  ticketingSystem: {
                    select: {
                      organization: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                  Event: {
                    select: {
                      EventCategoryTickets: {
                        select: {
                          total: true,
                          totalOverride: true,
                          priceOverride: true,
                          category: {
                            select: {
                              price: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return {
      sacemDeclaration: sacemDeclarationPrismaToModel(sacemDeclaration.eventSerieDeclaration.eventSerie, sacemDeclaration),
    };
  }),
});
