import { MjmlDivider, MjmlRaw, MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/standard';
import { Attachment as EmailAttachment } from '@ad/src/emails/mailer';
import { useServerTranslation } from '@ad/src/i18n';

export function formatTitle() {
  return `Nouveau message pour votre dossier`;
}

export interface CaseMessageToRequesterEmailProps {
  subject: string;
  firstname: string;
  lastname: string;
  caseHumanId: string;
  htmlMessageContent: string;
  attachments?: EmailAttachment[];
}

export function CaseMessageToRequesterEmail(props: CaseMessageToRequesterEmailProps) {
  const { t } = useServerTranslation('common');
  const title = formatTitle();

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>
          Bonjour {props.firstname} {props.lastname},
        </p>
        <p>Votre médiateur vient d&apos;apporter une nouvelle réponse à votre dossier n°{props.caseHumanId}.</p>
        {!!props.attachments && props.attachments.length > 0 && (
          <p
            dangerouslySetInnerHTML={{
              __html: t('email.template.CaseMessageEmail.attachmentsInThisEmail', { count: props.attachments.length }),
            }}
          />
        )}
      </MjmlText>
      <MjmlDivider />
      <MjmlText>
        <p>{props.subject}</p>
        <MjmlRaw>
          <div dangerouslySetInnerHTML={{ __html: props.htmlMessageContent }} />
        </MjmlRaw>
      </MjmlText>
      <MjmlDivider />
      <MjmlText>
        <p>À noter que vous pouvez apporter réponse directement en répondant à cet email.</p>
      </MjmlText>
    </StandardLayout>
  );
}
