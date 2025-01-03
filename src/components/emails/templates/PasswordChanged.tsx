import { MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';

export function formatTitle() {
  return `Mot de passe mis à jour`;
}

export interface PasswordChangedEmailProps {
  firstname: string;
}

export function PasswordChangedEmail(props: PasswordChangedEmailProps) {
  const title = formatTitle();

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour {props.firstname},</p>
        <p>Nous avons bien pris en compte votre changement de mot de passe. Celui-ci est effectif dès maintenant.</p>
      </MjmlText>
    </StandardLayout>
  );
}
