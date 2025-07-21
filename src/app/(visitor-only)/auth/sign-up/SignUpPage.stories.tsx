import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm, playFindFormInMain } from '@ad/.storybook/testing';
import { Normal as VisitorOnlyLayoutNormalStory } from '@ad/src/app/(visitor-only)/VisitorOnlyLayout.stories';
import { Empty as SignUpFormEmptyStory } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpForm.stories';
import { SignUpPage } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpPage';
import { SignUpPageContext } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpPageContext';
import { linkRegistry } from '@ad/src/utils/routes/registry';

type ComponentType = typeof SignUpPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/SignUp',
  component: SignUpPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [],
  },
};

const tokenProvidedParameters = {
  nextjs: {
    navigation: {
      pathname: linkRegistry.get('signUp', undefined), // Prevent the sticky header
      query: {},
    },
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <SignUpPage />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  onSuccess: () => {},
};
NormalStory.parameters = { ...defaultMswParameters, ...tokenProvidedParameters };
NormalStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: SignUpPageContext,
    value: {
      ContextualSignUpForm: SignUpFormEmptyStory,
    },
  },
});

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {
  ...NormalStory.args,
};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...defaultMswParameters,
  ...tokenProvidedParameters,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindFormInMain(canvasElement);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: VisitorOnlyLayoutNormalStory,
  childrenContext: {
    context: SignUpPageContext,
    value: {
      ContextualSignUpForm: SignUpFormEmptyStory,
    },
  },
});
