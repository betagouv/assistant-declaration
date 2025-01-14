import { MjmlButton, MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';

export function formatTitle() {
  return `Confirmation d'inscription`;
}

export interface SignUpConfirmationEmailProps {
  firstname: string;
  signInUrl: string;
}

export function SignUpConfirmationEmail(props: SignUpConfirmationEmailProps) {
  const title = formatTitle();

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour {props.firstname},</p>
        <p>Nous sommes ravis de vous confirmer que votre compte a été créé.</p>
      </MjmlText>
      <MjmlButton href={props.signInUrl}>Se connecter</MjmlButton>
      <MjmlText>
        <p style={{ fontWeight: 'bold' }}>
          Vos identifiants sont strictement personnels, et en aucun cas notre équipe ne vous demandera de les communiquer.
        </p>
        <p>
          Si vous avez la moindre question concernant la plateforme, ou une idée d&apos;amélioration, n&apos;hésitez pas à contacter le support depuis
          votre espace membre.
        </p>
      </MjmlText>
    </StandardLayout>
  );
}
