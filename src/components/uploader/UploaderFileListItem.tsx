import DeleteIcon from '@mui/icons-material/Delete';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ReplayIcon from '@mui/icons-material/Replay';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { FileIcon } from '@ad/src/components/FileIcon';
import { BusinessError, fileRetriableUploadError } from '@ad/src/models/entities/errors';
import { EnhancedUppyFile } from '@ad/src/utils/uppy';

export interface UploaderFileListItemProps {
  file: EnhancedUppyFile;
  onCancel: () => void;
  onRemove: () => void;
  onRetry: () => void;
}

export function UploaderFileListItem({ file, onCancel, onRemove, onRetry }: UploaderFileListItemProps) {
  const { t } = useTranslation('common');

  const itemRef = useRef<HTMLLIElement | null>(null); // This is used to scroll to the error messages

  const { error } = useMemo(() => {
    // The error must be a string according to how Uppy made the typing, so from the `upload-error` callback
    // we may pass a the custom error code to reuse the right error from here
    let parsedError: BusinessError | Error | null = null;

    if (file.error) {
      parsedError = file.error === fileRetriableUploadError.code ? fileRetriableUploadError : new Error(file.error);

      itemRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    return {
      error: parsedError,
    };
  }, [file.error]);

  return (
    <>
      <ListItem ref={itemRef}>
        <ListItemIcon className="disabledA11y" sx={{ minWidth: 0, width: 30, mr: 2 }}>
          <FileIcon contentType={file.type} />
        </ListItemIcon>
        <ListItemText
          primary={file.name}
          secondary={t('file.size', { size: file.size })}
          sx={{
            flexShrink: 0, // Like that if there is an error the block won't compress the filename
          }}
          data-sentry-mask
        />
        {error && (
          <ErrorAlert
            errors={[error]}
            style={{
              marginLeft: '1.5rem',
              marginRight: '3.5rem', // Since with an error there is 2 icons in the "absolute area" we adjust manually
            }}
          />
        )}
        {file.progress?.percentage !== undefined && file.progress.percentage < 100 ? (
          <>
            <IconButton edge="end" aria-label={`fichier en cours de transmission`} sx={{ ml: 2 }}>
              {/* TODO: `IconButton` should be `ListItemIcon` here but struggled to make it aligned so leaving it for now */}
              {/* Sometimes, either because the file is too little or because of server configuration
                  no update of the progress is done. So we consider showing an infinite loader if 0%.

                  Like that if no update will appear until 100% there is a sense of loading, and if there is a progress update
                  the determinate loader should move fast from 0% to get simulate a smooth progress. */}
              <CircularProgress
                size={24}
                aria-label={`fichier en cours de transmission`}
                {...(file.progress.percentage > 0
                  ? {
                      variant: 'determinate',
                      value: file.progress.percentage,
                    }
                  : {})}
              />
            </IconButton>
            <IconButton onClick={onCancel} edge="end" aria-label="annuler" sx={{ ml: 2 }}>
              <HighlightOffIcon />
            </IconButton>
          </>
        ) : (
          <>
            {error && (
              <IconButton onClick={onRetry} edge="end" aria-label="réessayer" sx={{ ml: 2 }}>
                <ReplayIcon />
              </IconButton>
            )}
            <IconButton onClick={onRemove} edge="end" aria-label="supprimer" sx={{ ml: 2 }}>
              <DeleteIcon />
            </IconButton>
          </>
        )}
      </ListItem>
    </>
  );
}
