'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { useContext } from 'react';

import { AccountSettingsPageContext } from '@ad/src/app/(private)/account/settings/AccountSettingsPageContext';
import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { UpdateProfilePrefillSchema } from '@ad/src/models/actions/user';
import { formTitleClasses } from '@ad/src/utils/form';

export function AccountSettingsPage() {
  const { ContextualEditProfileForm, ContextualChangePasswordForm } = useContext(AccountSettingsPageContext);

  const { data, error, isPending, refetch } = trpc.getProfile.useQuery({});

  if (isPending) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (error) {
    return (
      <div className={fr.cx('fr-container', 'fr-py-12v')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-md-8', 'fr-col-lg-6')}>
            <ErrorAlert errors={[error]} refetchs={[refetch]} />
          </div>
        </div>
      </div>
    );
  }

  const profile = data!.user;

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6', 'fr-px-md-12v')}>
          <h1 className={fr.cx(...formTitleClasses)}>Modifier votre profil</h1>
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
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6', 'fr-px-md-12v')}>
          <h2 className={fr.cx(...formTitleClasses)}>Redéfinir votre mot de passe</h2>
          <ContextualChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
