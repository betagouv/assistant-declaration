import { MjmlDivider, MjmlRaw, MjmlText } from '@faire/mjml-react';

import { StandardLayout } from '@ad/src/components/emails/layouts/standard';
import { Attachment as EmailAttachment } from '@ad/src/emails/mailer';
import { useServerTranslation } from '@ad/src/i18n';

export function formatTitle() {
  return `Un médiateur vous a écrit`;
}

export interface CaseMessageEmailProps {
  subject: string;
  caseHumanId: string;
  htmlMessageContent: string;
  attachments?: EmailAttachment[];
}

export function CaseMessageEmail(props: CaseMessageEmailProps) {
  const { t } = useServerTranslation('common');
  const title = formatTitle();

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>Bonjour,</p>
        <p>Un médiateur vient de vous écrire concernant le dossier n°{props.caseHumanId}.</p>
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
        <p style={{ fontWeight: 'bold' }}>Sujet : {props.subject}</p>
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
