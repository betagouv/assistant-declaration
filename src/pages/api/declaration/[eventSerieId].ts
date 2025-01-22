import { renderToStream } from '@react-pdf/renderer';
import slugify from '@sindresorhus/slugify';
import contentDisposition from 'content-disposition';
import { NextApiRequest, NextApiResponse } from 'next';
import { getToken as nextAuthGetToken } from 'next-auth/jwt';
import z from 'zod';

import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { SacemDeclarationSchema } from '@ad/src/models/entities/declaration/sacem';
import { fileNotFoundError, organizationCollaboratorRoleRequiredError } from '@ad/src/models/entities/errors';
import { nextAuthOptions } from '@ad/src/pages/api/auth/[...nextauth]';
import { prisma } from '@ad/src/prisma/client';
import { sacemDeclarationPrismaToModel } from '@ad/src/server/routers/mappers';
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
          EventSerieSacemDeclaration: {
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
    throw fileNotFoundError;
  }

  // Before returning, make sure the caller has rights on this authority ;)
  if (!(await isUserACollaboratorPartOfOrganization(eventSerie.ticketingSystem.organization.id, token.sub))) {
    throw organizationCollaboratorRoleRequiredError;
  }

  let jsxDocument: JSX.Element;
  let filename: string;
  if (input.type === DeclarationTypeSchema.Values.SACEM) {
    const existingDeclaration = eventSerie.EventSerieDeclaration.find((eSD) => eSD.EventSerieSacemDeclaration !== null);

    if (!existingDeclaration) {
      throw fileNotFoundError;
    }

    const sacemDeclaration = sacemDeclarationPrismaToModel(eventSerie, existingDeclaration.EventSerieSacemDeclaration!);

    jsxDocument = SacemDeclarationDocument({
      sacemDeclaration: sacemDeclaration,
      signatory: `${token.given_name} ${token.family_name}`,
    });

    filename = `Déclaration SACEM - ${slugify(eventSerie.name)}`;
  } else {
    throw fileNotFoundError;
  }

  const fileStream = await renderToStream(jsxDocument);

  await new Promise<void>(async function (resolve, reject) {
    setCommonFileHeaders(
      res,
      {
        contentType: 'application/pdf',
        name: filename,
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
