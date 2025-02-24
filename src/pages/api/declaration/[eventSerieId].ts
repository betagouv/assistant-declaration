import { renderToStream } from '@react-pdf/renderer';
import slugify from '@sindresorhus/slugify';
import contentDisposition from 'content-disposition';
import { NextApiRequest, NextApiResponse } from 'next';
import { getToken as nextAuthGetToken } from 'next-auth/jwt';
import z from 'zod';

import { SacdDeclarationDocument } from '@ad/src/components/documents/templates/SacdDeclaration';
import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { SacemDeclarationSchema } from '@ad/src/models/entities/declaration/sacem';
import { fileNotFoundError, organizationCollaboratorRoleRequiredError } from '@ad/src/models/entities/errors';
import { EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { nextAuthOptions } from '@ad/src/pages/api/auth/[...nextauth]';
import { prisma } from '@ad/src/prisma/client';
import {
  eventCategoryTicketsPrismaToModel,
  eventPrismaToModel,
  sacdDeclarationPrismaToModel,
  sacemDeclarationPrismaToModel,
  ticketCategoryPrismaToModel,
} from '@ad/src/server/routers/mappers';
import { isUserACollaboratorPartOfOrganization } from '@ad/src/server/routers/organization';
import { apiHandlerWrapper } from '@ad/src/utils/api';
import { safeCoerceToOptionalBoolean } from '@ad/src/utils/validation';

export type Attachment = {
  contentType: string;
  name: string | null;
};

export function setCommonFileHeaders(res: NextApiResponse, attachment: Attachment, toDownload: boolean) {
  res.setHeader('Content-Type', attachment.contentType);
  res.setHeader(
    'Content-Disposition',
    contentDisposition(attachment.name || undefined, {
      type: toDownload ? 'attachment' : 'inline',
    })
  );
}

//
// [IMPORTANT]
// Here we adapated another implementation managing multiple file types in case we need to evolve (and for simplicity)
// Ref: https://github.com/inclusion-numerique/mediature/tree/dev/apps/main/src/pages/api/file
//
// Note: at start we did a frontend PDF generation to be downloaded but due to CSP requiring `unsafe-eval` we switched to backend generation
// Refs:
// - https://github.com/diegomura/react-pdf/discussions/2590
// - https://github.com/diegomura/react-pdf/issues/2596
// - https://github.com/diegomura/react-pdf/issues/2815
//

export const GetSacemDeclarationFileSchema = z
  .object({
    eventSerieId: SacemDeclarationSchema.shape.id,
    type: DeclarationTypeSchema,
    download: safeCoerceToOptionalBoolean(z.boolean().optional()),
    // _rsc: z.string().optional(),
  })
  .strip();
export type GetSacemDeclarationFileSchemaType = z.infer<typeof GetSacemDeclarationFileSchema>;

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  const input = GetSacemDeclarationFileSchema.parse(req.query);

  const nextjsReq = req as NextApiRequest;
  const token = await nextAuthGetToken({ req: nextjsReq, secret: nextAuthOptions.secret });

  if (!token) {
    throw { status_code: 401, body: `you don't have the rights to view event serie declaration` };
  }

  const eventSerie = await prisma.eventSerie.findUnique({
    where: {
      id: input.eventSerieId,
    },
    select: {
      id: true,
      name: true,
      startAt: true,
      endAt: true,
      taxRate: true,
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
          EventSerieSacemDeclaration: true
            ? {
                select: {
                  id: true,
                  clientId: true,
                  placeName: true,
                  placeCapacity: true,
                  managerName: true,
                  managerTitle: true,
                  performanceType: true,
                  declarationPlace: true,
                  SacemDeclarationAccountingEntry: {
                    select: {
                      flux: true,
                      category: true,
                      categoryPrecision: true,
                      taxRate: true,
                      amount: true,
                    },
                  },
                },
              }
            : undefined,
          EventSerieSacdDeclaration:
            input.type === DeclarationTypeSchema.Values.SACD
              ? {
                  select: {
                    id: true,
                    clientId: true,
                    officialHeadquartersId: true,
                    productionOperationId: true,
                    productionType: true,
                    placeName: true,
                    placePostalCode: true,
                    placeCity: true,
                    audience: true,
                    placeCapacity: true,
                    declarationPlace: true,
                    organizer: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneId: true,
                        officialHeadquartersId: true,
                        europeanVatId: true,
                        headquartersAddress: {
                          select: {
                            id: true,
                            street: true,
                            city: true,
                            postalCode: true,
                            countryCode: true,
                            subdivision: true,
                          },
                        },
                        phone: {
                          select: {
                            id: true,
                            callingCode: true,
                            countryCode: true,
                            number: true,
                          },
                        },
                      },
                    },
                    producer: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneId: true,
                        officialHeadquartersId: true,
                        europeanVatId: true,
                        headquartersAddress: {
                          select: {
                            id: true,
                            street: true,
                            city: true,
                            postalCode: true,
                            countryCode: true,
                            subdivision: true,
                          },
                        },
                        phone: {
                          select: {
                            id: true,
                            callingCode: true,
                            countryCode: true,
                            number: true,
                          },
                        },
                      },
                    },
                    rightsFeesManager: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneId: true,
                        officialHeadquartersId: true,
                        europeanVatId: true,
                        headquartersAddress: {
                          select: {
                            id: true,
                            street: true,
                            city: true,
                            postalCode: true,
                            countryCode: true,
                            subdivision: true,
                          },
                        },
                        phone: {
                          select: {
                            id: true,
                            callingCode: true,
                            countryCode: true,
                            number: true,
                          },
                        },
                      },
                    },
                    SacdDeclarationAccountingEntry: {
                      select: {
                        category: true,
                        categoryPrecision: true,
                        taxRate: true,
                        amount: true,
                      },
                    },
                    SacdDeclarationPerformedWork: {
                      select: {
                        category: true,
                        name: true,
                        contributors: true,
                        durationSeconds: true,
                      },
                    },
                  },
                }
              : undefined,
        },
      },
      Event: {
        include: {
          // Here unlike the `listEvents` endpoint there is no need to list `EventCategoryTickets` entries that
          // do not exist in database (because the PDF does no need to show those having "no price and no sold ticket")
          EventCategoryTickets: {
            include: {
              category: true,
            },
            orderBy: {
              category: {
                name: 'asc',
              },
            },
          },
        },
        orderBy: {
          startAt: 'desc',
        },
      },
    },
  });

  if (!eventSerie) {
    throw fileNotFoundError;
  }

  // Before returning, make sure the caller has rights on this authority ;)
  if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, token.sub))) {
    throw organizationCollaboratorRoleRequiredError;
  }

  let jsxDocument: JSX.Element;
  let filename: string;
  if (input.type === DeclarationTypeSchema.Values.SACEM) {
    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => {
      return eSD.EventSerieSacemDeclaration !== null;
    });

    if (!existingDeclaration) {
      throw fileNotFoundError;
    }

    // [WORKAROUND] To optimize we put conditions into the database request but due to dynamic Prisma typings
    // it thinks `EventSerieSacemDeclaration.SacemDeclarationAccountingEntry` is missing whereas it's not, so casting
    const sacemDeclaration = sacemDeclarationPrismaToModel(eventSerie, existingDeclaration.EventSerieSacemDeclaration as any);

    jsxDocument = SacemDeclarationDocument({
      sacemDeclaration: sacemDeclaration,
      signatory: `${token.given_name} ${token.family_name}`,
    });

    filename = `Déclaration SACEM - ${slugify(eventSerie.name)}`;
  } else if (input.type === DeclarationTypeSchema.Values.SACD) {
    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacdDeclaration !== null);

    if (!existingDeclaration) {
      throw fileNotFoundError;
    }

    // [WORKAROUND] To optimize we put conditions into the database request but due to dynamic Prisma typings
    // it thinks `EventSerieSacdDeclaration` associations are missing whereas they are not, so casting
    const sacdDeclaration = sacdDeclarationPrismaToModel(eventSerie, existingDeclaration.EventSerieSacdDeclaration as any);

    jsxDocument = SacdDeclarationDocument({
      sacdDeclaration: sacdDeclaration,
      eventsWrappers: eventSerie.Event.map((event): EventWrapperSchemaType => {
        return {
          event: eventPrismaToModel(event),
          sales: event.EventCategoryTickets.map((eventCategoryTickets) => {
            return {
              ticketCategory: ticketCategoryPrismaToModel(eventCategoryTickets.category),
              eventCategoryTickets: eventCategoryTicketsPrismaToModel(eventCategoryTickets),
            };
          }),
        };
      }),
      taxRate: eventSerie.taxRate.toNumber(),
      signatory: `${token.given_name} ${token.family_name}`,
    });

    filename = `Déclaration SACD - ${slugify(eventSerie.name)}`;
  } else {
    throw fileNotFoundError;
  }

  const fileStream = await renderToStream(jsxDocument);

  await new Promise<void>(async function (resolve, reject) {
    setCommonFileHeaders(
      res,
      {
        contentType: 'application/pdf',
        name: `${filename}.pdf`,
      },
      input.download === true
    );

    fileStream.pipe(res);
    fileStream.on('end', resolve);
    fileStream.on('error', function (err) {
      throw err;
    });
  });
}

export default apiHandlerWrapper(handler);
