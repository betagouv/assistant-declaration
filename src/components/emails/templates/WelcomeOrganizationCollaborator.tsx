import { MjmlButton, MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';
import { titles } from '@ad/src/components/emails/templates/common';

export interface WelcomeOrganizationCollaboratorEmailProps {
  firstname: string;
  organizationDashboardUrl: string;
}

export function WelcomeOrganizationCollaboratorEmail(props: WelcomeOrganizationCollaboratorEmailProps) {
  const title = titles.WelcomeOrganizationCollaboratorEmail;

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour {props.firstname},</p>
        <p>Vous pouvez dès à présent accéder à la plateforme pour prendre en charge vos déclarations.</p>
      </MjmlText>
      <MjmlButton href={props.organizationDashboardUrl}>Accéder à la plateforme</MjmlButton>
      <MjmlText></MjmlText>
    </StandardLayout>
  );
}
