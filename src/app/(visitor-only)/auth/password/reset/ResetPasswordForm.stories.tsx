import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { ResetPasswordForm } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordForm';
import { ResetPasswordPrefillSchema } from '@ad/src/models/actions/auth';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof ResetPasswordForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Forms/ResetPassword',
  component: ResetPasswordForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['resetPassword'],
        response: undefined,
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <ResetPasswordForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {
  prefill: ResetPasswordPrefillSchema.parse({
    token: 'sunt-aut-quod',
  }),
};
EmptyStory.parameters = { ...defaultMswParameters };

export const Empty = prepareStory(EmptyStory);

const FilledStory = Template.bind({});
FilledStory.args = {
  prefill: ResetPasswordPrefillSchema.parse({
    token: 'sunt-aut-quod',
    password: 'Mypassword@1',
  }),
};
FilledStory.parameters = { ...defaultMswParameters };

export const Filled = prepareStory(FilledStory);
