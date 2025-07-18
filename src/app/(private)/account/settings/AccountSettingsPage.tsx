'use client';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useContext } from 'react';

import { AccountSettingsPageContext } from '@ad/src/app/(private)/account/settings/AccountSettingsPageContext';
import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { UpdateProfilePrefillSchema } from '@ad/src/models/actions/user';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredAlertContainerGridProps, centeredContainerGridProps } from '@ad/src/utils/grid';

export function AccountSettingsPage() {
  const { ContextualEditProfileForm, ContextualChangePasswordForm } = useContext(AccountSettingsPageContext);

  const { data, error, isPending, refetch } = trpc.getProfile.useQuery({});

  if (isPending) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (error) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={[error]} refetchs={[refetch]} />
      </Grid>
    );
  }

  const profile = data!.user;

  return (
    <Grid container {...centeredContainerGridProps} spacing={5} alignContent="flex-start">
      <Grid item xs={12} md={6}>
        <Typography component="h1" {...formTitleProps}>
          Modifier votre profil
        </Typography>
        <ContextualEditProfileForm
          email={profile.email}
          prefill={UpdateProfilePrefillSchema.parse({
            firstname: profile.firstname,
            lastname: profile.lastname,
          })}
          onSuccess={() => {
            // TODO: renew the JWT so the UI using token names is updated
            // Waiting for https://github.com/nextauthjs/next-auth/discussions/3941 to be achieved
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography component="h1" {...formTitleProps}>
          Redéfinir votre mot de passe
        </Typography>
        <ContextualChangePasswordForm />
      </Grid>
    </Grid>
  );
}
