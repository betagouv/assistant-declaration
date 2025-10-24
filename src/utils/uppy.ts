import { Uppy as UppyEntity, UppyFile } from '@uppy/core';

import { AttachmentKindSchemaType } from '@ad/src/models/entities/attachment';

type AdditionalMetaFields = {
  kind: AttachmentKindSchemaType; // Custom logic to ensure something uploaded with specific contraints cannot be bound to another kind elsewhere in the application
  relativePath: string | null; // Inherited from an old version, not sure if useful, but still used in our story test and referenced in the official documentation (https://uppy.io/docs/uppy/)
};

type ResponseBody = Record<string, unknown>; // Not used internally so it's fine setting this unknown type

export type EnhancedUppyFile = UppyFile<AdditionalMetaFields, ResponseBody>;

export type EnhancedUppyEntity = UppyEntity<AdditionalMetaFields, ResponseBody>;
