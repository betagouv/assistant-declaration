'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { useContext } from 'react';

import { OrganizationCreationPageContext } from '@ad/src/app/(private)/dashboard/organization/create/OrganizationCreationPageContext';
import { formTitleClasses } from '@ad/src/utils/form';

export function OrganizationCreationPage() {
  const { ContextualCreateOrganizationForm } = useContext(OrganizationCreationPageContext);

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        <div className={fr.cx('fr-col-md-6', 'fr-col-lg-4')}>
          <h1 className={fr.cx(...formTitleClasses)}>Créer une organisation</h1>
          <ContextualCreateOrganizationForm />
        </div>
      </div>
    </div>
  );
}
