import { PartialStoryFn } from 'storybook/internal/types';

import styles from '@ad/.storybook/email.module.scss';
import { convertComponentEmailToText } from '@ad/src/utils/email/helpers';

export function WithEmailClientOverviewFactory(subject: string) {
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
