'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { useContext } from 'react';

import { TicketingSystemConnectionPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/TicketingSystemConnectionPageContext';
import { formTitleClasses } from '@ad/src/utils/form';

export interface TicketingSystemConnectionPageProps {
  params: { organizationId: string };
}

export function TicketingSystemConnectionPage({ params: { organizationId } }: TicketingSystemConnectionPageProps) {
  const { ContextualConnectTicketingSystemForm } = useContext(TicketingSystemConnectionPageContext);

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        <div className={fr.cx('fr-col-md-6', 'fr-col-lg-4')}>
          <h1 className={fr.cx(...formTitleClasses)}>Connecter une billetterie</h1>
          <ContextualConnectTicketingSystemForm prefill={{ organizationId: organizationId }} />
        </div>
      </div>
    </div>
  );
}
