import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { SignInForm } from '@ad/src/app/(visitor-only)/auth/sign-in/SignInForm';
import { SignInPrefillSchema } from '@ad/src/models/actions/auth';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof SignInForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Forms/SignIn',
  component: SignInForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['confirmSignUp'],
        response: undefined,
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <SignInForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {};
EmptyStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Empty = prepareStory(EmptyStory);

export const FilledStory = Template.bind({});
FilledStory.args = {
  prefill: SignInPrefillSchema.parse({
    email: 'jean@france.fr',
    password: 'Mypassword@1',
    rememberMe: true,
  }),
};
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);

const LoggedOutStory = Template.bind({});
LoggedOutStory.parameters = {
  nextjs: {
    navigation: {
      query: {
        session_end: true,
      },
    },
  },
};
LoggedOutStory.args = {};
LoggedOutStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const LoggedOut = prepareStory(LoggedOutStory);

const ConfirmedStory = Template.bind({});
ConfirmedStory.parameters = {
  nextjs: {
    navigation: {
      query: {
        token: 'abc',
      },
    },
  },
};
ConfirmedStory.args = {};
ConfirmedStory.parameters = { ...defaultMswParameters };
ConfirmedStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Confirmed = prepareStory(ConfirmedStory);
