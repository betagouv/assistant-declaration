import type { Meta, StoryObj } from '@storybook/react';

import { MfaSettings, type MfaSettingsProps } from './MfaSettings';

const meta: Meta<typeof MfaSettings> = {
  title: 'Components/MfaSettings',
  component: MfaSettings,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof MfaSettings>;

export const Disabled: Story = {
  args: {
    mfaEnabled: false,
  },
};

export const Enabled: Story = {
  args: {
    mfaEnabled: true,
  },
};

export const Setup: Story = {
  args: {
    mfaEnabled: false,
    onSetup: async () => ({
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }),
  },
};

export const ErrorState: Story = {
  args: {
    mfaEnabled: false,
    onSetup: async () => {
      throw new Error('Erreur réseau');
    },
  },
};
