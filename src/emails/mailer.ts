import { renderToMjml } from '@faire/mjml-react/utils/renderToMjml';
import mjml2html from 'mjml';
import nodemailer, { Transporter } from 'nodemailer';
import type { Options as MailOptions } from 'nodemailer/lib/mailer/index';
import { Readable } from 'stream';

import { convertHtmlEmailToText } from '@ad/src/utils/email';

export interface EmailServerSettings {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface MailerOptions {
  defaultSender: string;
  smtp: EmailServerSettings;
  fallbackSmtp?: EmailServerSettings;
  domainsToCatch?: string[]; // Useful in development environment to avoid sending emails to demo accounts (to not stain domain reputation)
}

export interface Attachment {
  contentType: string;
  filename?: string;
  content: string | Buffer | Readable;
  inline: boolean;
  inlineId?: string;
}

export interface SendOptions {
  sender?: string;
  recipients: string[];
  subject: string;
  emailComponent: JSX.Element;
  attachments?: Attachment[];
}

export class Mailer {
  protected transporter: Transporter;
  protected fallbackTransporter: Transporter | null = null;
  protected defaultSender: string;
  protected domainsToCatch?: string[];

  constructor(options: MailerOptions) {
    this.defaultSender = options.defaultSender;
    this.domainsToCatch = options.domainsToCatch;

    this.transporter = nodemailer.createTransport({
      host: options.smtp.host,
      port: options.smtp.port,
      auth: {
        user: options.smtp.user,
        pass: options.smtp.password,
      },
    });

    if (options.fallbackSmtp) {
      this.fallbackTransporter = nodemailer.createTransport({
        host: options.fallbackSmtp.host,
        port: options.fallbackSmtp.port,
        auth: {
          user: options.fallbackSmtp.user,
          pass: options.fallbackSmtp.password,
        },
      });
    }
  }

  public close() {
    this.transporter.removeAllListeners();
    this.transporter.close();

    if (this.fallbackTransporter) {
      this.fallbackTransporter.removeAllListeners();
      this.fallbackTransporter.close();
    }
  }

  protected async send(options: SendOptions) {
    // Check if sending the email should be skipped or not
    if (this.domainsToCatch && this.domainsToCatch.length) {
      options.recipients = options.recipients.filter((recipient) => {
        const recipientDomain = recipient.split('@').pop();

        if (!recipientDomain || (this.domainsToCatch as string[]).includes(recipientDomain)) {
          console.log(`sending an email to ${recipient} is skipped due to his email domain being voluntarily catched`);

          return false;
        }

        return true;
      });
    }

    if (options.recipients.length === 0) {
      return;
    }

    const mjmlHtmlContent = renderToMjml(options.emailComponent);
    const transformResult = mjml2html(mjmlHtmlContent);

    if (transformResult.errors) {
      for (const err of transformResult.errors) {
        throw err;
      }
    }

    const rawHtmlVersion = transformResult.html;
    const plaintextVersion = convertHtmlEmailToText(rawHtmlVersion);

    const parameters: MailOptions = {
      from: options.sender || this.defaultSender,
      to: options.recipients.join(','),
      subject: options.subject,
      html: rawHtmlVersion,
      text: plaintextVersion,
      attachments: options.attachments ? options.attachments : undefined,
    };

    try {
      await this.transporter.sendMail(parameters);
    } catch (err) {
      console.error('the first attempt to send the email has failed');
      console.error(err);

      const retryTransporter = this.fallbackTransporter || this.transporter;

      try {
        await retryTransporter.sendMail(parameters);
      } catch (err) {
        console.error('the second attempt to send the email has failed');
        console.error(err);

        // Until we have a proper queue system we consider this as failing so the user (~= frontend) is aware something needs to be retried
        throw err;
      }
    }
  }
}

export const mailer = new Mailer({
  defaultSender: `Assistant déclaration <noreply@${process.env.MAILER_DEFAULT_DOMAIN || ''}>`,
  smtp: {
    host: process.env.MAILER_SMTP_HOST || '',
    port: process.env.MAILER_SMTP_PORT ? parseInt(process.env.MAILER_SMTP_PORT, 10) : 0,
    user: process.env.MAILER_SMTP_USER || '',
    password: process.env.MAILER_SMTP_PASSWORD || '',
  },
  fallbackSmtp: !!process.env.MAILER_FALLBACK_SMTP_HOST
    ? {
        host: process.env.MAILER_FALLBACK_SMTP_HOST || '',
        port: process.env.MAILER_FALLBACK_SMTP_PORT ? parseInt(process.env.MAILER_FALLBACK_SMTP_PORT, 10) : 0,
        user: process.env.MAILER_FALLBACK_SMTP_USER || '',
        password: process.env.MAILER_FALLBACK_SMTP_PASSWORD || '',
      }
    : undefined,
  domainsToCatch:
    !!process.env.MAILER_DOMAINS_TO_CATCH && process.env.MAILER_DOMAINS_TO_CATCH !== '' ? process.env.MAILER_DOMAINS_TO_CATCH.split(',') : undefined,
});
