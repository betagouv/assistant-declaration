import { Meta, StoryFn } from '@storybook/react';
import { screen, userEvent, within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { AddressField } from '@ad/src/components/AddressField';

type ComponentType = typeof AddressField;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/AddressField',
  component: AddressField,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

async function playFindLabel(canvasElement: HTMLElement): Promise<HTMLElement> {
  return await within(canvasElement).findByText(/address/i);
}

const Template: StoryFn<ComponentType> = (args) => {
  return <AddressField {...args} />;
};

const NoQueryStory = Template.bind({});
NoQueryStory.args = {
  inputProps: {
    label: 'Address',
  },
};
NoQueryStory.play = async ({ canvasElement }) => {
  await playFindLabel(canvasElement);
};

export const NoQuery = prepareStory(NoQueryStory);

const WithQueryStory = Template.bind({});
WithQueryStory.args = {
  ...NoQueryStory.args,
};
WithQueryStory.play = async ({ canvasElement }) => {
  await playFindLabel(canvasElement);

  const canvas = within(canvasElement);
  const input = await canvas.findByRole('combobox');

  await userEvent.type(input, 'moulin');

  await screen.findByText(/rennes/i);
};

export const WithQuery = prepareStory(WithQueryStory);
