import { MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';
import { titles } from '@ad/src/components/emails/templates/common';

export interface UserDeletedEmailProps {
  firstname: string;
}

export function UserDeletedEmail(props: UserDeletedEmailProps) {
  const title = titles.UserDeletedEmail;

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour {props.firstname},</p>
        <p>Un administrateur de la plateforme vient de désactiver vos accès.</p>
        <p>Bonne continuation de la part de toute l&apos;équipe,</p>
      </MjmlText>
    </StandardLayout>
  );
}
