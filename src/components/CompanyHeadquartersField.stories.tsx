import { Meta, StoryFn } from '@storybook/react';
import { screen, userEvent, within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { CompanyHeadquartersField } from '@ad/src/components/CompanyHeadquartersField';

type ComponentType = typeof CompanyHeadquartersField;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/CompanyHeadquartersField',
  component: CompanyHeadquartersField,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

async function playFindLabel(canvasElement: HTMLElement): Promise<HTMLElement> {
  return await within(canvasElement).findByText(/company/i);
}

const Template: StoryFn<ComponentType> = (args) => {
  return <CompanyHeadquartersField {...args} />;
};

const NoQueryStory = Template.bind({});
NoQueryStory.args = {
  inputProps: {
    label: 'Company headquarters',
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

  await userEvent.type(input, 'direction');

  await screen.findByText(/ségur/i);
};

export const WithQuery = prepareStory(WithQueryStory);
