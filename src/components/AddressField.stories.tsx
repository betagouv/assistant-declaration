import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

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
  return await within(canvasElement).findByLabelText(/ville/i);
}

const Template: StoryFn<ComponentType> = (args) => {
  return <AddressField {...args} />;
};

const NoPostalCodeStory = Template.bind({});
NoPostalCodeStory.args = {
  textFieldProps: {
    variant: 'standard',
    label: 'Ville',
  },
};
NoPostalCodeStory.play = async ({ canvasElement }) => {
  await playFindLabel(canvasElement);
};

export const NoPostalCode = prepareStory(NoPostalCodeStory);

const WithPostalCodeStory = Template.bind({});
WithPostalCodeStory.args = {
  ...NoPostalCodeStory.args,
  suggestionsPostalCode: '29200',
};
WithPostalCodeStory.play = async ({ canvasElement }) => {
  await playFindLabel(canvasElement);
};

export const WithPostalCode = prepareStory(WithPostalCodeStory);
