'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { useSearchParams } from 'next/navigation';
import { useContext } from 'react';

import { ResetPasswordPageContext } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordPageContext';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { ResetPasswordPrefillSchema } from '@ad/src/models/actions/auth';
import { wrongConfirmationTokenError } from '@ad/src/models/entities/errors';
import { formTitleClasses } from '@ad/src/utils/form';

export function ResetPasswordPage() {
  const { ContextualResetPasswordForm } = useContext(ResetPasswordPageContext);

  const searchParams = useSearchParams();
  const resetToken = searchParams!.get('token');

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        {!resetToken ? (
          <div className={fr.cx('fr-col-md-6', 'fr-col-lg-6')}>
            <ErrorAlert errors={[wrongConfirmationTokenError]} />
          </div>
        ) : (
          <div className={fr.cx('fr-col-md-6', 'fr-col-lg-4')}>
            <h1 className={fr.cx(...formTitleClasses)}>Redéfinir votre mot de passe</h1>
            <ContextualResetPasswordForm
              prefill={ResetPasswordPrefillSchema.parse({
                token: resetToken,
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
