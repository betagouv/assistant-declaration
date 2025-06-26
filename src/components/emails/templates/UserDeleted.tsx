import { MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';

export function formatTitle() {
  return `Compte désactivé`;
}

export interface UserDeletedEmailProps {
  firstname: string;
}

export function UserDeletedEmail(props: UserDeletedEmailProps) {
  const title = formatTitle();

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
