'use client';

import { Alert, Grid, Typography } from '@mui/material';
import { useContext, useState } from 'react';

import { ForgottenPasswordPageContext } from '@ad/src/app/(visitor-only)/auth/password/retrieve/ForgottenPasswordPageContext';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredFormContainerGridProps } from '@ad/src/utils/grid';

export function ForgottenPasswordPage() {
  const { ContextualRetrievePasswordForm } = useContext(ForgottenPasswordPageContext);

  const [requestCommitted, setRequestCommitted] = useState<boolean>(false);

  return (
    <Grid container {...centeredFormContainerGridProps}>
      {requestCommitted ? (
        <>
          <Grid item xs={12}>
            <Alert severity="success">Nous venons de vous envoyer un email pour réinitialiser votre mot de passe.</Alert>
          </Grid>
        </>
      ) : (
        <>
          <Typography component="h1" {...formTitleProps}>
            Mot de passe oublié ?
          </Typography>
          <ContextualRetrievePasswordForm
            onSuccess={async () => {
              setRequestCommitted(true);
            }}
          />
        </>
      )}
    </Grid>
  );
}
