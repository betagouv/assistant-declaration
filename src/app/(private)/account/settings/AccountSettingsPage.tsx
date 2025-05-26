'use client';

import { Grid, Typography } from '@mui/material';
import { createContext, useContext } from 'react';

import { ChangePasswordForm } from '@ad/src/app/(private)/account/settings/ChangePasswordForm';
import { EditProfileForm } from '@ad/src/app/(private)/account/settings/EditProfileForm';
import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { UpdateProfilePrefillSchema } from '@ad/src/models/actions/user';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredAlertContainerGridProps, centeredContainerGridProps } from '@ad/src/utils/grid';

export const AccountSettingsPageContext = createContext({
  ContextualEditProfileForm: EditProfileForm,
  ContextualChangePasswordForm: ChangePasswordForm,
});

export function AccountSettingsPage() {
  const { ContextualEditProfileForm, ContextualChangePasswordForm } = useContext(AccountSettingsPageContext);

  const { data, error, isLoading, refetch } = trpc.getProfile.useQuery({});

  if (isLoading) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (error) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={[error]} refetchs={[refetch]} />
      </Grid>
    );
  }

  const profile = data.user;

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
