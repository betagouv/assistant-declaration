import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindAlert, playFindForm, playFindFormInMain } from '@ad/.storybook/testing';
import { Normal as VisitorOnlyLayoutNormalStory } from '@ad/src/app/(visitor-only)/VisitorOnlyLayout.stories';
import { Empty as ResetPasswordFormEmptyStory } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordForm.stories';
import { ResetPasswordPage } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordPage';
import { ResetPasswordPageContext } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordPageContext';
import { linkRegistry } from '@ad/src/utils/routes/registry';

type ComponentType = typeof ResetPasswordPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/ResetPassword',
  component: ResetPasswordPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const tokenProvidedParameters = {
  nextjs: {
    navigation: {
      query: {
        pathname: linkRegistry.get('resetPassword', { token: 'abc' }), // Prevent the sticky header
        token: 'abc',
      },
    },
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <ResetPasswordPage />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = { ...tokenProvidedParameters };
NormalStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: ResetPasswordPageContext,
    value: {
      ContextualResetPasswordForm: ResetPasswordFormEmptyStory,
    },
  },
});

const InvalidTokenStory = Template.bind({});
InvalidTokenStory.args = {};
InvalidTokenStory.parameters = {};
InvalidTokenStory.play = async ({ canvasElement }) => {
  await playFindAlert(canvasElement);
};

export const InvalidToken = prepareStory(InvalidTokenStory, {
  childrenContext: {
    context: ResetPasswordPageContext,
    value: {
      ContextualResetPasswordForm: ResetPasswordFormEmptyStory,
    },
  },
});

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...tokenProvidedParameters,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindFormInMain(canvasElement);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: VisitorOnlyLayoutNormalStory,
  childrenContext: {
    context: ResetPasswordPageContext,
    value: {
      ContextualResetPasswordForm: ResetPasswordFormEmptyStory,
    },
  },
});
