import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Uppy from '@uppy/core';
import '@uppy/core/dist/style.min.css';
import DragDrop from '@uppy/drag-drop';
import fr_FR from '@uppy/locales/lib/fr_FR';
import Tus from '@uppy/tus';
import { FileKind } from 'human-filetypes';
import { RefObject, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { UploaderFileList } from '@ad/src/components/uploader/UploaderFileList';
import '@ad/src/components/uploader/drag-drop.scss';
import { AttachmentKindRequirementsSchemaType, UiAttachmentSchemaType } from '@ad/src/models/entities/attachment';
import { mockBaseUrl, shouldTargetMock } from '@ad/src/server/mock/environment';
import { getExtensionsFromFileKinds, getFileIdFromUrl, getFileKindFromMime, getMimesFromFileKinds } from '@ad/src/utils/attachment';
import { bitsFor } from '@ad/src/utils/bits';
import {
  AdditionalMetaFields,
  EnhancedUppyEntity,
  EnhancedUppyEventMap,
  EnhancedUppyFile,
  EnhancedUppyState,
  ResponseBody,
} from '@ad/src/utils/uppy';
import { getBaseUrl } from '@ad/src/utils/url';

export const UploaderContext = createContext({
  ContextualUploaderFileList: UploaderFileList,
});

export interface UploaderProps {
  attachmentKindRequirements: AttachmentKindRequirementsSchemaType;
  initialState?: EnhancedUppyState;
  minFiles?: number;
  maxFiles: number;
  onCommittedFilesChanged?: (attachments: UiAttachmentSchemaType[]) => Promise<void>;
  onStateChanged?: (state: EnhancedUppyState) => Promise<void>;
  postUploadHook?: (internalId: string) => Promise<void>;
  // TODO: onError (useful if the list is not displayed... the parent can use a custom error) ... throw error if one of the two not enabled
  isUploadingChanged?: (value: boolean) => void;
}

export function Uploader({
  attachmentKindRequirements,
  initialState,
  minFiles,
  maxFiles,
  onCommittedFilesChanged,
  onStateChanged,
  postUploadHook,
  isUploadingChanged,
}: UploaderProps) {
  const { t } = useTranslation('common');
  const { ContextualUploaderFileList } = useContext(UploaderContext);

  const dragAndDropRef = useRef<HTMLElement | null>(null); // This is used to scroll to the error message
  const [globalError, setGlobalError] = useState<Error | null>(null);

  const [uppy, setUppy] = useState<EnhancedUppyEntity>(() => setupUppy({ attachmentKindRequirements, initialState, minFiles, maxFiles }));
  const [files, setFiles] = useState<EnhancedUppyFile[]>(() => uppy.getFiles());
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    const updateFiles = () => {
      setFiles(uppy.getFiles());
    };

    const handlers: Pick<
      EnhancedUppyEventMap,
      | 'file-added'
      | 'file-removed'
      | 'upload-progress'
      | 'upload-success'
      | 'upload-error'
      | 'restriction-failed'
      | 'info-visible'
      | 'info-hidden'
      | 'upload'
      | 'complete'
    > = {
      'file-added': (file) => {
        updateFiles();
      },
      'file-removed': (file) => {
        updateFiles();
      },
      'upload-progress': (file, progress) => {
        updateFiles();
      },
      'upload-success': async (file, response) => {
        if (!file || !response.uploadURL) {
          return;
        }

        const internalId = getFileIdFromUrl(response.uploadURL);

        await reusableUploadSuccessCallback(uppy, file, response, internalId, onCommittedFilesChanged, onStateChanged, postUploadHook);

        updateFiles();
      },
      'upload-error': (file, error, response) => {
        updateFiles();
      },
      'restriction-failed': (file, error) => {
        setGlobalError(error);

        dragAndDropRef.current?.scrollIntoView({ behavior: 'smooth' });
      },
      'info-visible': () => {
        const { info } = uppy.getState();

        info.forEach((infoItem) => {
          console.log(infoItem.details ? `${infoItem.message} ${infoItem.details}` : infoItem.message);
        });
      },
      'info-hidden': () => {
        setGlobalError(null);
      },
      upload: (data) => {
        // Triggered when upload starts
        setIsUploading(true);
      },
      complete: (result) => {
        setIsUploading(false);
      },
    };

    // TODO: notify parent... how to know if it's "is loading" for any file? Watch the progress and parse all files to see if finish or not?
    // Make sure to notify only if it changes... but it rerenders the parent... maybe better to have the reference? not sure...

    const registerListeners = () => {
      // All possibility listed on https://uppy.io/docs/uppy/#events
      uppy.on('file-added', handlers['file-added']);
      uppy.on('file-removed', handlers['file-removed']);
      uppy.on('upload-progress', handlers['upload-progress']);
      uppy.on('upload-success', handlers['upload-success']);
      uppy.on('upload-error', handlers['upload-error']);
      uppy.on('restriction-failed', handlers['restriction-failed']);
      uppy.on('info-visible', handlers['info-visible']);
      uppy.on('info-hidden', handlers['info-hidden']);
      uppy.on('upload', handlers['upload']);
      uppy.on('complete', handlers['complete']);
    };

    const unregisterListeners = () => {
      uppy.off('file-added', handlers['file-added']);
      uppy.off('file-removed', handlers['file-removed']);
      uppy.off('upload-progress', handlers['upload-progress']);
      uppy.off('upload-success', handlers['upload-success']);
      uppy.off('upload-error', handlers['upload-error']);
      uppy.off('restriction-failed', handlers['restriction-failed']);
      uppy.off('info-visible', handlers['info-visible']);
      uppy.off('info-hidden', handlers['info-hidden']);
      uppy.off('upload', handlers['upload']);
      uppy.off('complete', handlers['complete']);
    };

    setupTus(uppy);
    setupDragDrop(uppy, dragAndDropRef);
    registerListeners();

    return () => {
      unregisterListeners();
      uppy.destroy();
    };
  }, [uppy, onCommittedFilesChanged, onStateChanged, postUploadHook]);

  useEffect(() => {
    if (isUploadingChanged) {
      isUploadingChanged(isUploading);
    }
  }, [isUploading, isUploadingChanged]);

  const cancelUpload = useCallback(
    (file: EnhancedUppyFile) => {
      uppy.removeFile(file.id);
    },
    [uppy]
  );

  const removeFile = useCallback(
    (file: EnhancedUppyFile) => {
      uppy.removeFile(file.id);
    },
    [uppy]
  );

  const retryUpload = useCallback(
    async (file: EnhancedUppyFile) => {
      if (file.meta.internalMeta?.postUploadHookFailure === true) {
        // Reuse the logic after the Uppy logic succeeds
        const internalId = file.meta.internalMeta.id;

        await reusableUploadSuccessCallback(uppy, file, file.response, internalId, onCommittedFilesChanged, onStateChanged, postUploadHook);

        setFiles(uppy.getFiles());
      } else {
        // It was a standard file upload, retry with the Uppy logic
        await uppy.retryUpload(file.id);
      }
    },
    [uppy, onCommittedFilesChanged, onStateChanged, postUploadHook]
  );

  const allowedExtensions = getExtensionsFromFileKinds(attachmentKindRequirements.allowedFileTypes);

  return (
    <div>
      {!!uppy && (
        <>
          <Typography component="div" variant="caption">
            Taille maximale : {t('file.size', { size: attachmentKindRequirements.maxSize })}.{' '}
            {t('file.allowedExtensions', { extensions: allowedExtensions.join(', '), count: allowedExtensions.length })}
            {maxFiles > 1 && <> {t('file.upToMaxfiles', { count: maxFiles })}</>}
          </Typography>
          <Box className="uppy-Container">
            <Box ref={dragAndDropRef} />
          </Box>
          {globalError && (
            <>
              <ErrorAlert errors={[globalError]} style={{ marginTop: '0.5rem' }} />
            </>
          )}
          {files.length > 0 && (
            <>
              <ContextualUploaderFileList files={files} onCancel={cancelUpload} onRemove={removeFile} onRetry={retryUpload} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function setupUppy(props: Pick<UploaderProps, 'attachmentKindRequirements' | 'initialState' | 'minFiles' | 'maxFiles'>): EnhancedUppyEntity {
  const instance = new Uppy<AdditionalMetaFields, ResponseBody>({
    id: 'uppy',
    autoProceed: true,
    locale: getLocale(),
    allowMultipleUploads: true,
    debug: false,
    meta: {
      kind: props.attachmentKindRequirements.id,
    },
    restrictions: {
      maxFileSize: props.attachmentKindRequirements.maxSize,
      allowedFileTypes: getMimesFromFileKinds(props.attachmentKindRequirements.allowedFileTypes),
      minNumberOfFiles: props.minFiles || 0,
      maxNumberOfFiles: props.maxFiles,
    },
  });

  if (props.initialState) {
    // Instanciating a `DefaultStore` and using its `setState`, then passing it to uppy at init with `store: ...` was not working
    // so doing it at a different step
    instance.setState(props.initialState);
  }

  return instance;
}

function setupTus(uppy: EnhancedUppyEntity) {
  // The maximum chunk size is really important depending on the backend limits:
  // - Google Storage recommends 8 MiB when uploading with chunks directly on them
  // - Istio could have some limitations but we didn't find what they are
  // - Scalingo could have some limitations but we didn't find what they are
  // - Behind a Nginx going over 1 MiB is problematic, it's possible to set the setting `client_max_body_size` but it seems a general one (whereas we would like to adjust the chunk size on a specific endpoint)
  // - Since we use a `tus` server on Scalingo we will set a reasonnable limit (5 MiB)
  const chunkSize = 5 * bitsFor.MiB;

  const baseUrl = shouldTargetMock ? mockBaseUrl : getBaseUrl();

  uppy.use(Tus, {
    endpoint: `${baseUrl}/api/upload`,
    removeFingerprintOnSuccess: true,
    chunkSize,
    headers: {
      // Authorization: 'WILL_BE_PATCHED_BEFORE_EACH_UPLOAD_IF_NEEDED',
    },
    withCredentials: true,
    allowedMetaFields: ['kind', 'type', 'name'], // Allow only certain metadata to be transmitted
    // autoRetry: true,
    // limit: 0,
    onBeforeRequest: async (req, file) => {
      // Session token is passed through cookie (and `withCredentials`), no need of a `Authorization` header
    },
    // onProgress: () => {},
    // onSuccess: () => {},
    // onError: () => {},
  });
}

function setupDragDrop(uppy: EnhancedUppyEntity, dragAndDropRef: RefObject<HTMLElement | null>) {
  uppy.use(DragDrop, {
    target: dragAndDropRef.current || undefined,
    height: '100%',
    width: '100%',
  });
}

function getLocale(): any {
  // TODO: if multiple locales allowed, manage switching to another like en_FB...
  return fr_FR;
}

async function reusableUploadSuccessCallback(
  uppy: EnhancedUppyEntity,
  file: EnhancedUppyFile,
  response: EnhancedUppyFile['response'],
  internalId: string,
  onCommittedFilesChanged: UploaderProps['onCommittedFilesChanged'],
  onStateChanged: UploaderProps['onStateChanged'],
  postUploadHook: UploaderProps['postUploadHook']
) {
  if (postUploadHook) {
    try {
      await postUploadHook(internalId);
    } catch (err) {
      // Force an error as if it was part of content upload to reuse the display
      uppy.setFileState(file.id, {
        meta: {
          ...file.meta,
          internalMeta: {
            id: internalId,
            postUploadHookFailure: true,
          },
        },
        response: {
          status: 500,
        },
      });

      return;
    }
  }

  // If everything is good, keep the information for later process
  uppy.setFileState(file.id, {
    meta: {
      ...file.meta,
      internalMeta: {
        uploadSuccess: true,
        id: internalId,
      },
    },
  });

  const attachments: UiAttachmentSchemaType[] = await Promise.all(
    uppy
      .getFiles()
      .filter((f) => {
        return f.meta.internalMeta?.uploadSuccess === true;
      })
      .map(async (f) => {
        let localUrl: string | null = null;

        if (file.meta.type && getFileKindFromMime(file.meta.type) === FileKind.Image) {
          // The `file.data` type says it can be just the size property, which would be unexpected
          if (file.data instanceof Blob) {
            const base64 = await convertBlobToBase64(file.data);

            localUrl = base64 as string;
          }
        }

        return {
          id: f.meta.internalMeta?.id,
          url: localUrl ?? `NOT_AVAILABLE_DUE_TO_UPPY_RESTRICTION_ON_RESPONSE_HEADERS`,
        } as UiAttachmentSchemaType;
      })
  );

  onCommittedFilesChanged && onCommittedFilesChanged(attachments);
  onStateChanged && onStateChanged(uppy.getState());

  if (postUploadHook) {
    // If we succeed the hook, we can safely remove the file since the parent is supposed to manage the UI
    uppy.removeFile(file.id);
  }
}

async function convertBlobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      resolve(reader.result);
    };
  });
}
