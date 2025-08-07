import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid } from '@mui/material';
import React, { useRef, useState } from 'react';

import { ErrorAlert } from '@ad/src/components/ErrorAlert';

export interface ConfirmationDialogProps {
  open: boolean;
  title?: string;
  description?: string | React.JSX.Element;
  onConfirm: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onClose: () => void;
  hideCancel?: boolean;
}

export const ConfirmationDialog = (props: ConfirmationDialogProps) => {
  const [isPending, setIsLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<Error | null>(null);
  const dialogContentRef = useRef<HTMLDivElement | null>(null); // This is used to scroll to the error messages

  const closeCallback = () => {
    props.onClose();
    setActionError(null);
  };

  return (
    <Dialog
      fullWidth
      open={props.open}
      onClose={() => {
        if (isPending) {
          // Prevent closing if the user just confirms an action
          return;
        }

        closeCallback();
      }}
    >
      <DialogTitle>{props.title || 'Confirmation'}</DialogTitle>
      <DialogContent ref={dialogContentRef}>
        <DialogContentText component="div">
          <Grid container direction="column" spacing={2}>
            {!!actionError && (
              <Grid item xs={12}>
                <ErrorAlert errors={[actionError]} />
              </Grid>
            )}
            <Grid item component="p" xs={12}>
              {props.description || 'Êtes-vous sûr de vouloir continuer ?'}
            </Grid>
          </Grid>
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {props.hideCancel !== true && (
          <Button
            onClick={async () => {
              if (props.onCancel) {
                await props.onCancel();
              }

              closeCallback();
            }}
            disabled={isPending}
          >
            Annuler
          </Button>
        )}
        <Button
          color="primary"
          onClick={async () => {
            setIsLoading(true);

            try {
              await props.onConfirm();

              closeCallback();
            } catch (err) {
              if (err instanceof Error) {
                setActionError(err);
              } else {
                setActionError(err as any); // The default case is good enough for now
              }

              dialogContentRef.current?.scrollIntoView({ behavior: 'smooth' });
            } finally {
              setIsLoading(false);
            }
          }}
          loading={isPending}
          variant="contained"
        >
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};
