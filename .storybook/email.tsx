import { PartialStoryFn } from 'storybook/internal/types';

import styles from '@ad/.storybook/email.module.scss';
import { StorybookRendererLayout } from '@ad/src/components/emails/layouts/StorybookRenderer';
import { convertComponentEmailToText } from '@ad/src/utils/email/helpers';

export const commonEmailsParameters = {
  layout: 'fullscreen',
  // TODO: for now we have a race condition on rendering it the first time so it breaks tests into Chromatic,
  // we disable the snapshots for now until we find a solution. Same for local test runners.
  chromatic: { disableSnapshot: true },
  testRunner: { disable: true },
};

export function withEmailRenderer(Story: PartialStoryFn) {
  return (
    <StorybookRendererLayout>
      <Story />
    </StorybookRendererLayout>
  );
}

export function withEmailClientOverviewFactory(subject: string) {
  const EmailClientOverview = (Story: PartialStoryFn) => {
    const HtmlVersion = Story;
    const PlaintextVersion = convertComponentEmailToText(<Story />);

    return (
      <article className={styles.emailTemplate}>
        <header className={styles.templateName}>
          <p className={styles.emailSubject}>Subject: {subject}</p>
        </header>
        <main className={styles.templateContainer}>
          <section className={styles.templateHtml}>
            <span className={styles.badge}>HTML</span>
            <div>
              <HtmlVersion />
            </div>
          </section>
          <section className={styles.templatePlaintext}>
            <span className={styles.badge}>Plaintext</span>
            <div style={{ whiteSpace: 'pre-wrap' }}>{PlaintextVersion}</div>
          </section>
        </main>
      </article>
    );
  };

  return EmailClientOverview;
}
