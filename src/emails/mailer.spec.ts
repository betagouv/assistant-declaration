/** @jest-environment node */

import { jest } from '@jest/globals';
import type { Transporter } from 'nodemailer';

import { Mailer } from '@ad/src/emails/mailer';

const sendMailMock = jest.fn<Transporter['sendMail']>();

class TestMailer extends Mailer {
  public constructor() {
    super({
      defaultSender: 'Assistant declaration <noreply@example.com>',
      smtp: {
        host: 'localhost',
        port: 1025,
        user: 'user',
        password: 'password',
      },
    });

    this.transporter = {
      close: jest.fn(),
      removeAllListeners: jest.fn(),
      sendMail: sendMailMock,
    } as unknown as Transporter;
  }
}

describe('Mailer', () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue(undefined);
  });

  it('sends rendered HTML and plaintext for a password-reset request', async () => {
    const mailer = new TestMailer();

    await mailer.sendNewPasswordRequest({
      firstname: 'Ned',
      recipient: 'ned@example.com',
      resetPasswordUrlWithToken: 'https://example.com/reset?token=secret',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('R\u00e9initialiser mon mot de passe'),
        text: expect.stringContaining('R\u00e9initialiser mon mot de passe'),
      })
    );
  });
});
