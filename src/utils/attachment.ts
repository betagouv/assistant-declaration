import { FileKind, mimeData } from 'human-filetypes';

import { AttachmentKindRequirementsSchemaType, AttachmentKindSchema } from '@ad/src/models/entities/attachment';
import { bitsFor } from '@ad/src/utils/bits';

export interface AttachmentKindList {
  [key: string]: AttachmentKindRequirementsSchemaType;
}

export const attachmentKindList: AttachmentKindList = {
  [AttachmentKindSchema.enum.EVENT_SERIE_DOCUMENT]: {
    id: AttachmentKindSchema.enum.EVENT_SERIE_DOCUMENT,
    maxSize: 5 * bitsFor.MiB,
    allowedFileTypes: [FileKind.Image, FileKind.Document, FileKind.Spreadsheet, FileKind.Presentation],
    postUploadOperations: null,
    requiresAuthToUpload: true,
    isAttachmentPublic: false,
  },
};

export function getMimesFromFileKinds(fileKinds: FileKind[]) {
  return Object.entries(mimeData)
    .filter(([mimeTypeKey, mimeTypeObject]) => {
      return fileKinds.includes(mimeTypeObject.kind);
    })
    .map(([mimeTypeKey, mimeTypeObject]) => mimeTypeKey);
}

export function getExtensionsFromFileKinds(fileKinds: FileKind[]) {
  const allExtensions = Object.entries(mimeData)
    .filter(([mimeTypeKey, mimeTypeObject]) => {
      return fileKinds.includes(mimeTypeObject.kind);
    })
    .map(([mimeTypeKey, mimeTypeObject]) => mimeTypeObject.extensions)
    .flat(1);

  return [...new Set(allExtensions)].map((extensionWithDot) => extensionWithDot?.substring(1));
}

export function getExtensionsFromMime(contentType: string): string[] {
  return mimeData[contentType]?.extensions || [];
}

export function getFileKindFromMime(contentType: string): FileKind | null {
  return mimeData[contentType].kind;
}

// Getter for the internal file ID since we have no other way to retrieve it from here (it's behind the Tus server)
export function getFileIdFromUrl(url: string): string {
  const urlParts = new URL(url).pathname.split('/');

  return urlParts[urlParts.length - 1];
}
