import { MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';
import { titles } from '@ad/src/components/emails/templates/common';
import { Attachment as EmailAttachment } from '@ad/src/emails/mailer';

export interface DeclarationToSacemAgencyEmailProps {
  eventSerieName: string;
  originatorFirstname: string;
  originatorLastname: string;
  originatorEmail: string;
  organizationName: string;
  attachments: EmailAttachment[];
  aboutUrl: string;
}

export function DeclarationToSacemAgencyEmail(props: DeclarationToSacemAgencyEmailProps) {
  const title = titles.DeclarationToSacemAgencyEmail;

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour,</p>
        <p>
          Dans le cadre de notre mission de service public, vous trouverez ci-joint la déclaration du spectacle{' '}
          <span style={{ fontWeight: 'bold' }}>{props.eventSerieName}</span>. Cette télédéclaration a été effectuée par{' '}
          <span style={{ fontWeight: 'bold' }}>
            {props.originatorFirstname} {props.originatorLastname}
          </span>{' '}
          pour la structure <span style={{ fontWeight: 'bold' }}>{props.organizationName}</span>.
        </p>
        <p>
          Si besoin vous pouvez :
          <ul>
            <li>
              Contacter le déclarant via <a href={`mailto:${props.originatorEmail}`}>{props.originatorEmail}</a> ou en faisant directement
              &quot;Répondre&quot; ;
            </li>
            <li>
              Nous contacter en utilisant <a href={props.aboutUrl}>la section support</a>.
            </li>
          </ul>
        </p>
        <p>
          <span style={{ fontStyle: 'italic' }}>
            Pour rappel : l&apos;Assistant déclaration a été lancé en 2025 pour tenter de simplifier les déclarations des entrepreneurs du spectacle
            vivant. Nous restons à l&apos;écoute de toute suggestion pour améliorer la façon dont nous vous transmettons les données.
          </span>
        </p>
        <p>Merci,</p>
      </MjmlText>
      <MjmlText></MjmlText>
    </StandardLayout>
  );
}
