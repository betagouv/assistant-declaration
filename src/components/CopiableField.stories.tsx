import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { CopiableField } from '@ad/src/components/CopiableField';

type ComponentType = typeof CopiableField;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/CopiableField',
  component: CopiableField,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <CopiableField {...args} />;
};

const DefaultStory = Template.bind({});
DefaultStory.args = {
  label: 'Test',
  value: 'This is a test!',
};
DefaultStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('button', { name: /test/i });
};

export const Default = prepareStory(DefaultStory);
