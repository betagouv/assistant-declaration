import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { WithLayout as DocsLayoutWithLayoutStory } from '@ad/src/app/(public)/docs/DocsLayout.stories';
import Content from '@ad/src/app/(public)/docs/billetweb-connection/content.mdx';
import { linkRegistry } from '@ad/src/utils/routes/registry';

type ComponentType = typeof Content;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/Docs/BilletwebConnection',
  component: Content,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <Content />;
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
      pathname: linkRegistry.get('docsBilletwebConnection', undefined), // Needed for the side menu
    },
  },
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: DocsLayoutWithLayoutStory,
});
