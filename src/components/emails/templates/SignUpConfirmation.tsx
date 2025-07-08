import { MjmlButton, MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';
import { titles } from '@ad/src/components/emails/templates/common';

export interface SignUpConfirmationEmailProps {
  firstname: string;
  confirmationUrl: string;
}

export function SignUpConfirmationEmail(props: SignUpConfirmationEmailProps) {
  const title = titles.SignUpConfirmationEmail;

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour {props.firstname},</p>
        <p>Vous devez confirmer votre inscription en cliquant sur le bouton ci-dessous afin d&apos;accéder pleinement à notre plateforme.</p>
      </MjmlText>
      <MjmlButton href={props.confirmationUrl}>Confirmer mon inscription</MjmlButton>
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
