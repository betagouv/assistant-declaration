import type { Meta, StoryObj } from '@storybook/react';

import { SessionProvider } from '@ad/src/proxies/next-auth/react';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

import { MfaPage } from './MfaPage';
import MfaLayout from './layout';

// Generate a real QR code SVG for Storybook
function generateQrCodeSvg(data: string): string {
  // Simple placeholder - in real app this would use a QR library
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="50" height="50" fill="black"/>
      <rect x="140" y="10" width="50" height="50" fill="black"/>
      <rect x="10" y="140" width="50" height="50" fill="black"/>
      <text x="80" y="105" font-size="10" text-anchor="middle" fill="black">QR Code</text>
    </svg>
  `)}`;
}

const MOCK_QR_CODE = generateQrCodeSvg('otpauth://totp/AssistantDeclaration:test@example.com?secret=JBSWY3DPEHPK3PXP');

const meta: Meta<typeof MfaPage> = {
  title: 'Pages/MFA Page',
  component: MfaPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <SessionProvider
        session={{
          user: {
            id: 'test-123',
            firstname: 'Test',
            lastname: 'User',
            email: 'test@example.com',
            mfaEnabled: false,
            mfaVerified: false,
          },
          expires: new Date(Date.now() + 3600000).toISOString(),
        }}
      >
        <MfaLayout>
          <Story />
        </MfaLayout>
      </SessionProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MfaPage>;

export const SetupMode: Story = {
  name: 'Setup Mode (MFA not enabled)',
  parameters: {
    msw: {
      handlers: [
        getTRPCMock({
          type: 'mutation',
          path: ['setupMfaSecret'],
          response: {
            secret: 'JBSWY3DPEHPK3PXP',
            qrCode: MOCK_QR_CODE,
          },
        }),
        getTRPCMock({
          type: 'mutation',
          path: ['verifyMfaSetup'],
          response: { success: true },
        }),
      ],
    },
  },
};

export const VerificationMode: Story = {
  name: 'Verification Mode (MFA enabled, not verified)',
  decorators: [
    (Story) => (
      <SessionProvider
        session={{
          user: {
            id: 'test-123',
            firstname: 'Test',
            lastname: 'User',
            email: 'test@example.com',
            mfaEnabled: true,
            mfaVerified: false,
          },
          expires: new Date(Date.now() + 3600000).toISOString(),
        }}
      >
        <Story />
      </SessionProvider>
    ),
  ],
  parameters: {
    msw: {
      handlers: [
        getTRPCMock({
          type: 'mutation',
          path: ['verifyMfaLogin'],
          response: { success: true },
        }),
      ],
    },
  },
};

export const Loading: Story = {
  name: 'Loading State',
  decorators: [
    (Story) => (
      <SessionProvider session={null}>
        <Story />
      </SessionProvider>
    ),
  ],
};
