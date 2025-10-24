import { AttachmentStatus, Prisma } from '@prisma/client';
import { getUnixTime, minutesToSeconds } from 'date-fns';
import { SignJWT, jwtVerify } from 'jose';
import isJwtTokenExpired from 'jwt-check-expiry';
import * as tus from 'tus-js-client';

import { AttachmentKindRequirementsSchemaType, AttachmentKindSchemaType } from '@ad/src/models/entities/attachment';
import { fileUploadError, tooManyUploadedFilesError } from '@ad/src/models/entities/errors';
import { prisma } from '@ad/src/prisma/client';
import { getFileIdFromUrl } from '@ad/src/utils/attachment';
import { bitsFor } from '@ad/src/utils/bits';
import { getSimpleArraysDiff, sortSimpleArraysDiff } from '@ad/src/utils/comparaison';
import { getListeningPort, getLocalHostname } from '@ad/src/utils/url';
import { getBaseUrl } from '@ad/src/utils/url';

// We use a symetric key since the encode/decode is done in the same program
const algorithm = 'HS256';

export const tokenFileIdClaim = 'urn:claim:file_id';
export const attachmentLinkExpiresIn = minutesToSeconds(15); // Must be less than the validity
export const attachmentLinkModuloIntervalMinutes = 10;

// Round the time to the last X-minute mark
export const getLastModuloTime = () => {
  const currentTime = new Date();
  const d = new Date(currentTime);

  d.setMinutes(Math.floor(d.getMinutes() / attachmentLinkModuloIntervalMinutes) * attachmentLinkModuloIntervalMinutes);
  d.setSeconds(0);
  d.setMilliseconds(0);

  return d;
};

export async function generateSignedAttachmentLink(attachmentId: string, secret: Uint8Array): Promise<string> {
  // Since generating signed URLs for the same attachment will result in different URLs due to expiration time
  // we need to shift a bit the expiration in the past at "a modulo" so some URLs are the same to be cached by the browser
  const lastModuloTimestamp = getUnixTime(getLastModuloTime());

  const jwt = await new SignJWT({ [tokenFileIdClaim]: attachmentId })
    .setProtectedHeader({ alg: algorithm })
    .setIssuedAt(lastModuloTimestamp)
    .setExpirationTime(lastModuloTimestamp + attachmentLinkExpiresIn)
    .sign(secret);

  const url = new URL(getBaseUrl());
  url.pathname = `/api/file/${attachmentId}`;
  url.searchParams.append('token', jwt);

  return url.toString();
}

export interface SignedAttachmentLinkVerification {
  isVerified: boolean;
  isExpired: boolean;
}

export async function verifySignedAttachmentLink(
  expectedAttachmentId: string,
  secret: Uint8Array,
  token: string
): Promise<SignedAttachmentLinkVerification> {
  try {
    if (isJwtTokenExpired(token)) {
      return {
        isVerified: false,
        isExpired: true,
      };
    }

    const { payload } = await jwtVerify(token, secret);

    if (payload[tokenFileIdClaim] !== expectedAttachmentId) {
      return {
        isVerified: false,
        isExpired: false,
      };
    }

    return {
      isVerified: true,
      isExpired: false,
    };
  } catch (err) {
    return {
      isVerified: false,
      isExpired: false,
    };
  }
}

export interface SafeAttachmentsToProcessOptions {
  maxAttachmentsTotal?: number;
  prismaInstance?: Prisma.TransactionClient;
}

export interface SafeAttachmentsToProcess {
  markNewAttachmentsAsUsed: () => Promise<void>;
  attachmentsToAdd: string[];
  attachmentsToRemove: string[];
  attachmentsUnchanged: string[];
}

export async function formatSafeAttachmentsToProcess(
  attachmentKind: AttachmentKindSchemaType,
  inputAttachmentsIds: string[],
  existingAttachmentsIds: string[],
  options?: SafeAttachmentsToProcessOptions
): Promise<SafeAttachmentsToProcess> {
  const prismaInstance = options?.prismaInstance ?? prisma;

  // Remove duplicates
  inputAttachmentsIds = [...new Set(inputAttachmentsIds)];
  existingAttachmentsIds = [...new Set(existingAttachmentsIds)];

  if (options) {
    if (options.maxAttachmentsTotal !== undefined && inputAttachmentsIds.length + existingAttachmentsIds.length > options.maxAttachmentsTotal) {
      throw tooManyUploadedFilesError;
    }
  }

  const diffResult = getSimpleArraysDiff(existingAttachmentsIds, inputAttachmentsIds);
  const sortedDiffResult = sortSimpleArraysDiff(diffResult);

  if (sortedDiffResult.added.length > 0) {
    const existingAttachments = await prismaInstance.attachment.findMany({
      where: {
        id: {
          in: sortedDiffResult.added,
        },
        kind: attachmentKind,
        status: AttachmentStatus.PENDING_UPLOAD,
      },
    });

    // If it does not match there are multiple possibilities, all suspicious:
    // - the user tries to bind a different kind of document (maybe to bypass upload restrictions)
    // - the user tries to bind a document already bound, it could be an attempt to "steal" another document by making it visible on the hacker's account (but this one is already considered "valid")
    // - the user tries to bind a document not bound, but pending uploads are removed after a few days and their UUID is unguessable
    if (existingAttachments.length !== sortedDiffResult.added.length) {
      throw fileUploadError;
    }
  }

  return {
    attachmentsToAdd: sortedDiffResult.added,
    attachmentsToRemove: sortedDiffResult.removed,
    attachmentsUnchanged: sortedDiffResult.unchanged.concat(sortedDiffResult.updated), // Those "updated" during the diff is just about the array index being different
    markNewAttachmentsAsUsed:
      sortedDiffResult.added.length > 0
        ? async () => {
            // Files unbound from any business entity will be clean up by a regular cron job
            await prismaInstance.attachment.updateMany({
              data: {
                status: AttachmentStatus.VALID,
              },
              where: {
                id: {
                  in: sortedDiffResult.added,
                },
              },
            });
          }
        : async () => {},
  };
}

export interface UploadFileOptions {
  filename: string;
  contentType: string;
  kind: AttachmentKindRequirementsSchemaType;
  file: Buffer | NodeJS.ReadableStream;
  fileSize?: number; // In case you pass a stream you must specify the total length of it... but it's hard when generating on the backend without reading the stream for no other reason. So we decided to use `Buffer` in most cases
}

export async function uploadFile(options: UploadFileOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    // Since this function is for the server usage librairies will often generate a the Node.js `ReadableStream` or `Buffer`
    // whereas Tus only accepts the browser `ReadableStream` and `Blob`. Casting should be enough in all cases
    const file = options.file as unknown as Blob | ReadableStreamDefaultReader;

    // Reuse the same as for the frontend, it's to limit memory usage in our case
    const chunkSize = 5 * bitsFor.MiB;

    const upload = new tus.Upload(file, {
      endpoint: `http://${getLocalHostname()}:${getListeningPort()}/api/upload`, // Use the local address to prevent sending the file over the external network
      chunkSize: chunkSize,
      uploadSize: options.fileSize,
      metadata: {
        name: options.filename,
        type: options.contentType,
        kind: options.kind.id,
      },
      headers: {},
      retryDelays: [1000],
      onError(error) {
        reject(error);

        // Cancel the stream manually (it's done automatically in the `onSuccess`)
        // TODO: but I didn't find for example `pdfStream.destroy()` or `pdfStream.cancel()`...
      },
      onShouldRetry(err, retryAttempt, options) {
        // Prevent retrying
        return false;
      },
      async onSuccess() {
        if (upload.url) {
          const fileId = await getFileIdFromUrl(upload.url);

          resolve(fileId);
        } else {
          reject(new Error('the upload has been a success but no URL was provided'));
        }
      },
    });
    upload.start();
  });
}
