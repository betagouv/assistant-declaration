'use client';

import { Grid, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useContext } from 'react';

import { ResetPasswordPageContext } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordPageContext';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { ResetPasswordPrefillSchema } from '@ad/src/models/actions/auth';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredAlertContainerGridProps, centeredFormContainerGridProps } from '@ad/src/utils/grid';

export function ResetPasswordPage() {
  const { ContextualResetPasswordForm } = useContext(ResetPasswordPageContext);

  const searchParams = useSearchParams();
  const resetToken = searchParams!.get('token');

  if (!resetToken) {
    const error = new Error(`Le jeton de réinitialisation de mot de passe n'est pas détecté, merci de bien copier le lien depuis l'email.`);

    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={[error]} />
      </Grid>
    );
  }

  return (
    <Grid container {...centeredFormContainerGridProps}>
      <Typography component="h1" {...formTitleProps}>
        Redéfinir votre mot de passe
      </Typography>
      <ContextualResetPasswordForm
        prefill={ResetPasswordPrefillSchema.parse({
          token: resetToken,
        })}
      />
    </Grid>
  );
}
