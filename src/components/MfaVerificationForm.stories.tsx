import { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';

import { MfaVerificationForm } from './MfaVerificationForm';

const meta = {
  title: 'Authentification/MfaVerificationForm',
  component: MfaVerificationForm,
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    loading: { control: 'boolean' },
    error: { control: 'text' },
    locked: { control: 'boolean' },
    lockedUntil: { control: 'number' },
  },
} satisfies Meta<typeof MfaVerificationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
    loading: false,
    error: '',
    locked: false,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    loading: true,
  },
};

export const Error: Story = {
  args: {
    ...Default.args,
    error: 'Le code saisi est incorrect. Veuillez réessayer.',
  },
};

export const Locked: Story = {
  args: {
    ...Default.args,
    locked: true,
    lockedUntil: Date.now() + 60 * 1000,
  },
};
