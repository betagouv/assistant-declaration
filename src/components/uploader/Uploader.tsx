import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Uppy, { RestrictionError } from '@uppy/core';
import '@uppy/core/css/style.min.css';
import DragDrop from '@uppy/drag-drop';
import fr_FR from '@uppy/locales/lib/fr_FR';
import Tus from '@uppy/tus';
import { RefObject, createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { UploaderFileList, UploaderFileListProps } from '@ad/src/components/uploader/UploaderFileList';
import '@ad/src/components/uploader/drag-drop.scss';
import { AttachmentKindRequirementsSchemaType, UiAttachmentSchemaType } from '@ad/src/models/entities/attachment';
import { BusinessError, fileRetriableUploadError } from '@ad/src/models/entities/errors';
import { mockBaseUrl, shouldTargetMock } from '@ad/src/server/mock/environment';
import { getExtensionsFromFileKinds, getFileIdFromUrl, getMimesFromFileKinds } from '@ad/src/utils/attachment';
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
  listStyle?: UploaderFileListProps['style'];
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
  listStyle,
}: UploaderProps) {
  const { t } = useTranslation('common');
  const { ContextualUploaderFileList } = useContext(UploaderContext);

  const dragAndDropRef = useRef<HTMLElement | null>(null); // This is used to scroll to the error message
  const [globalError, setGlobalError] = useState<Error | null>(null);

  const [uppy, setUppy] = useState<EnhancedUppyEntity>(() => setupUppy({ attachmentKindRequirements, initialState, minFiles, maxFiles }));
  const [files, setFiles] = useState<EnhancedUppyFile[]>(() => uppy.getFiles());

  useEffectOnce(() => {
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
        // This is the only callback where we can access the error object details
        // TODO: here we simulate a basic case, but this could be improved to better handle our custom errors from the server
        // Note: it's possible to detail more the context with `error instanceof DetailedError`
        if (file && response && response.status >= 500) {
          uppy.setFileState(file.id, {
            error: fileRetriableUploadError.code, // It expects string so we respect the Uppy logic to avoid side issue despite passing custom error received elsewhere in the "file" object
          });
        }

        updateFiles();
      },
      'restriction-failed': (file, error) => {
        let readableError: BusinessError | null = null;

        if (error instanceof RestrictionError) {
          // The error message is already translated by Uppy
          // And so the error code does not matter since no translation needed from within the `ErrorAlert` component
          readableError = new BusinessError('uppy_error', error.message);
        }

        setGlobalError(readableError ?? error);

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
        isUploadingChanged && isUploadingChanged(true);
      },
      complete: (result) => {
        isUploadingChanged && isUploadingChanged(false);
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
  });

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
          <ContextualUploaderFileList files={files} onCancel={cancelUpload} onRemove={removeFile} onRetry={retryUpload} style={listStyle} />
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
  // TODO: if multiple locales allowed, manage switching to another like en_GB...
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
      // Useful in case of directly pushing information to a server
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

  // The parent component is likely to allow user to see files uploaded and served by the backend
  // so we also make sure to provide a preview URL so it respects the same logic even if it's through `blob://...`
  // (indeed uploaded files are removed from the "temporary upload zone" and cannot be accessed with a backend logic)
  // Note: we are not using `URL.revokeObjectURL()` to release the resource because we don't know exactly from here
  // when the user will have the final JWT-encoded URL from the backend, or when the user will remove it from the list before committing it to the backend
  // ... normally it should auto clean up after the DOM unloads, if any issue we could manage a custom logic from the parent component
  const previewUrl = file.data instanceof Blob ? URL.createObjectURL(file.data) : `blob://local_error_that_should_not_happen`;

  // If everything is good, keep the information for later process
  uppy.setFileState(file.id, {
    meta: {
      ...file.meta,
      internalMeta: {
        uploadSuccess: true,
        id: internalId,
      },
    },
    preview: previewUrl,
  });

  const attachments: UiAttachmentSchemaType[] = uppy
    .getFiles()
    .filter((f) => {
      return f.meta.internalMeta?.uploadSuccess === true;
    })
    .map((f) => {
      return {
        id: f.meta.internalMeta?.id ?? 'unexpected_error',
        url: f.preview ?? 'blob://unexpected_error',
        contentType: file.meta.type,
        size: file.size,
        name: file.meta.name,
      } satisfies UiAttachmentSchemaType;
    });

  onCommittedFilesChanged && onCommittedFilesChanged(attachments);
  onStateChanged && onStateChanged(uppy.getState());

  // If a success, we can safely remove the file since the parent is supposed to manage the UI to list uploaded files
  // Note: it will throw a network error because also trying to remove the file from the server, but when fully uploaded
  // the backend Tus server is already handling the clean up for privacy purpose. It cannot be caught from here, just leaving this liek that
  uppy.removeFile(file.id);
}
