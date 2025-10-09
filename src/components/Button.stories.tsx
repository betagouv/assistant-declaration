import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindButton } from '@ad/.storybook/testing';
import { Button } from '@ad/src/components/Button';

type ComponentType = typeof Button;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/Button',
  component: Button,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <Button {...args}>Validate</Button>;
};

const DefaultStory = Template.bind({});
DefaultStory.args = {};
DefaultStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /validate/i);
};

export const Default = prepareStory(DefaultStory);

const LoadingStory = Template.bind({});
LoadingStory.args = {
  ...DefaultStory.args,
  loading: true,
};
LoadingStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /validate/i);
};

export const Loading = prepareStory(LoadingStory);
