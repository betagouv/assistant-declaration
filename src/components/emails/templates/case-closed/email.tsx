import { MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/standard';
import { getServerTranslation } from '@ad/src/i18n';
import { getCaseEmail } from '@ad/src/utils/business/case';

export function formatTitle() {
  return `Clôture de votre dossier`;
}

export interface CaseClosedEmailProps {
  firstname: string;
  lastname: string;
  caseHumanId: string;
  authorityName: string;
}

export function CaseClosedEmail(props: CaseClosedEmailProps) {
  const { t } = getServerTranslation('common');

  const title = formatTitle();

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>
          {props.firstname} {props.lastname},
        </p>
        <p>La médiation menée suite à votre réclamation est à présent terminée. Votre dossier n°{props.caseHumanId} est clos.</p>
        <p>Pour toute question sur cette clôture, veuillez adresser un email à {getCaseEmail(t, props.caseHumanId)}</p>
      </MjmlText>
    </StandardLayout>
  );
}
