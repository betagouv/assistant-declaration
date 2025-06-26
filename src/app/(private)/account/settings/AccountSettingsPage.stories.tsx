import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForms, playFindFormsInMain } from '@ad/.storybook/testing';
import { AsNewUser as PrivateLayoutAsNewUserStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { AccountSettingsPage, AccountSettingsPageContext } from '@ad/src/app/(private)/account/settings/AccountSettingsPage';
import { Empty as ChangePasswordFormEmptyStory } from '@ad/src/app/(private)/account/settings/ChangePasswordForm.stories';
import { Empty as EditProfileFormEmptyStory } from '@ad/src/app/(private)/account/settings/EditProfileForm.stories';
import { users } from '@ad/src/fixtures/user';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof AccountSettingsPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/AccountSettings',
  component: AccountSettingsPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'query',
        path: ['getProfile'],
        response: {
          user: users[0],
        },
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <AccountSettingsPage />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = { ...defaultMswParameters };
NormalStory.play = async ({ canvasElement }) => {
  await playFindForms(canvasElement);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: AccountSettingsPageContext,
    value: {
      ContextualEditProfileForm: EditProfileFormEmptyStory,
      ContextualChangePasswordForm: ChangePasswordFormEmptyStory,
    },
  },
});

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...defaultMswParameters,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindFormsInMain(canvasElement);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsNewUserStory,
  childrenContext: {
    context: AccountSettingsPageContext,
    value: {
      ContextualEditProfileForm: EditProfileFormEmptyStory,
      ContextualChangePasswordForm: ChangePasswordFormEmptyStory,
    },
  },
});
