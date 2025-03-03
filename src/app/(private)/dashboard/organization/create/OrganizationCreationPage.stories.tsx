import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm, playFindFormInMain } from '@ad/.storybook/testing';
import { AsNewUser as PrivateLayoutAsNewUserStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { Empty as CreateOrganizationFormEmptyStory } from '@ad/src/app/(private)/dashboard/organization/create/CreateOrganizationForm.stories';
import {
  OrganizationCreationPage,
  OrganizationCreationPageContext,
} from '@ad/src/app/(private)/dashboard/organization/create/OrganizationCreationPage';

type ComponentType = typeof OrganizationCreationPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/CreateOrganization',
  component: OrganizationCreationPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <OrganizationCreationPage />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: OrganizationCreationPageContext,
    value: {
      ContextualCreateOrganizationForm: CreateOrganizationFormEmptyStory,
    },
  },
});

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindFormInMain(canvasElement);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsNewUserStory,
  childrenContext: {
    context: OrganizationCreationPageContext,
    value: {
      ContextualCreateOrganizationForm: CreateOrganizationFormEmptyStory,
    },
  },
});
