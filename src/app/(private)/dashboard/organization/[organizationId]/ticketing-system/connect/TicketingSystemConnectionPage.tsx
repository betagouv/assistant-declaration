'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import { useContext } from 'react';

import styles from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/TicketingSystemConnectionPage.module.scss';
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
          <h1 className={cx(fr.cx(...formTitleClasses), styles.customH1)} style={{ color: fr.colors.decisions.text.title.blueFrance.default }}>
            Pour gagner du temps, <span className={fr.cx('fr-text--bold')}>branchez votre logiciel de billetterie</span>, cela pré-remplira vos
            déclarations. Cette action est optionnelle.
          </h1>
          <ContextualConnectTicketingSystemForm prefill={{ organizationId: organizationId }} />
        </div>
      </div>
    </div>
  );
}
