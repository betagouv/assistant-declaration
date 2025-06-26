import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMainTitle } from '@ad/.storybook/testing';
import { AsNewUser as PrivateLayoutAsNewUserStory, interfaceSessionQueryFactory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { DashboardPage } from '@ad/src/app/(private)/dashboard/DashboardPage';
import { collaboratorOfSample } from '@ad/src/fixtures/ui';

type ComponentType = typeof DashboardPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/Dashboard',
  component: DashboardPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <DashboardPage {...args} />;
};

const AsNewUserStory = Template.bind({});
AsNewUserStory.args = {};
AsNewUserStory.parameters = {
  ...interfaceSessionQueryFactory({
    collaboratorOf: [],
    isAdmin: false,
  }),
};
AsNewUserStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /Bienvenue/i);
};

export const AsNewUser = prepareStory(AsNewUserStory);

const AsNewUserWithLayoutStory = Template.bind({});
AsNewUserWithLayoutStory.args = {};
AsNewUserWithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...AsNewUserStory.parameters,
};
AsNewUserWithLayoutStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /Bienvenue/i);
};

export const AsNewUserWithLayout = prepareStory(AsNewUserWithLayoutStory, {
  layoutStory: PrivateLayoutAsNewUserStory,
});
