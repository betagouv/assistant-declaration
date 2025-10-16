'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useContext, useState } from 'react';

import { ForgottenPasswordPageContext } from '@ad/src/app/(visitor-only)/auth/password/retrieve/ForgottenPasswordPageContext';
import { formTitleClasses } from '@ad/src/utils/form';

export function ForgottenPasswordPage() {
  const { ContextualRetrievePasswordForm } = useContext(ForgottenPasswordPageContext);

  const [requestCommitted, setRequestCommitted] = useState<boolean>(false);

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        <div className={fr.cx('fr-col-md-6', 'fr-col-lg-4')}>
          {requestCommitted ? (
            <>
              <Alert
                severity="success"
                small={false}
                title="Succès"
                description="Nous venons de vous envoyer un email pour réinitialiser votre mot de passe."
              />
            </>
          ) : (
            <>
              <h1 className={fr.cx(...formTitleClasses)}>Mot de passe oublié ?</h1>
              <ContextualRetrievePasswordForm
                onSuccess={async () => {
                  setRequestCommitted(true);
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
