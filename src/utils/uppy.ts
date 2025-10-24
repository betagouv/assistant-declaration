import { State, Uppy as UppyEntity, UppyEventMap, UppyFile } from '@uppy/core';

import { AttachmentKindSchemaType } from '@ad/src/models/entities/attachment';

export type AdditionalMetaFields = {
  kind: AttachmentKindSchemaType; // Custom logic to ensure something uploaded with specific contraints cannot be bound to another kind elsewhere in the application
  relativePath?: string | null; // Inherited from an old version, not sure if useful, but still used in our story test and referenced in the official documentation (https://uppy.io/docs/uppy/)
  internalMeta?: {
    id: string;
    uploadSuccess?: true;
    postUploadHookFailure?: true;
  };
};

export type ResponseBody = Record<string, unknown>; // Not used internally so it's fine setting this unknown type

export type EnhancedUppyFile = UppyFile<AdditionalMetaFields, ResponseBody>;

export type EnhancedUppyEntity = UppyEntity<AdditionalMetaFields, ResponseBody>;

export type EnhancedUppyEventMap = UppyEventMap<AdditionalMetaFields, ResponseBody>;

export type EnhancedUppyState = State<AdditionalMetaFields, ResponseBody>;
