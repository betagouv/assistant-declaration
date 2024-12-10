import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { SignUpForm } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpForm';
import { users } from '@ad/src/fixtures/user';
import { SignUpPrefillSchema } from '@ad/src/models/actions/auth';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof SignUpForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Forms/SignUp',
  component: SignUpForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['signUp'],
        response: {
          user: users[0],
        },
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <SignUpForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {
  prefill: SignUpPrefillSchema.parse({
    invitationToken: 'abc',
  }),
};
EmptyStory.parameters = { ...defaultMswParameters };
EmptyStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Empty = prepareStory(EmptyStory);

const FilledStory = Template.bind({});
FilledStory.args = {
  prefill: SignUpPrefillSchema.parse({
    invitationToken: 'abc',
    email: 'jean@france.fr',
    password: 'Mypassword@1',
    firstname: 'Jean',
    lastname: 'Derrien',
    termsAccepted: true,
  }),
};
FilledStory.parameters = { ...defaultMswParameters };
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);
