import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { AsVisitor as PublicLayoutAsVisitorStory } from '@ad/src/app/(public)/PublicLayout.stories';
import { FrequentlyAskedQuestionsPage } from '@ad/src/app/(public)/frequently-asked-questions/FrequentlyAskedQuestionsPage';

type ComponentType = typeof FrequentlyAskedQuestionsPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/FrequentlyAskedQuestions',
  component: FrequentlyAskedQuestionsPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <FrequentlyAskedQuestionsPage />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};

export const Normal = prepareStory(NormalStory);

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PublicLayoutAsVisitorStory,
});
