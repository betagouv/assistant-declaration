import { MjmlButton, MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';
import { titles } from '@ad/src/components/emails/templates/common';

export interface PasswordResetEmailProps {
  firstname: string;
  signInUrl: string;
}

export function PasswordResetEmail(props: PasswordResetEmailProps) {
  const title = titles.PasswordResetEmail;

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour {props.firstname},</p>
        <p>La réinitialisation de votre mot de passe est maintenant effective, vous pouvez dès maintenant utiliser vos nouveaux identifiants.</p>
      </MjmlText>
      <MjmlButton href={props.signInUrl}>Se connecter</MjmlButton>
      <MjmlText></MjmlText>
    </StandardLayout>
  );
}
