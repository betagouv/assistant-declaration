import { Attachment as EmailAttachment } from '@ad/src/emails/mailer';
import { imageB64Data } from '@ad/src/fixtures/image';

export const emailAttachments: EmailAttachment[] = [
  {
    contentType: 'image/jpeg',
    filename: 'sample-1.jpg',
    content: Buffer.from(imageB64Data, 'base64'),
    inline: false,
  },
  {
    contentType: 'image/jpeg',
    filename: 'sample-2.jpg',
    content: Buffer.from(imageB64Data, 'base64'),
    inline: false,
  },
];
