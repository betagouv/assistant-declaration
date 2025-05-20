import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { HomePage } from '@ad/src/app/(public)/(home)/HomePage';
import { AsVisitor as PublicLayoutAsVisitorStory } from '@ad/src/app/(public)/PublicLayout.stories';
import { linkRegistry } from '@ad/src/utils/routes/registry';

type ComponentType = typeof HomePage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/Home',
  component: HomePage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <HomePage />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};

export const Normal = prepareStory(NormalStory);

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  nextjs: {
    navigation: {
      pathname: linkRegistry.get('home', undefined), // Needed for the sticky header
    },
  },
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PublicLayoutAsVisitorStory,
});
