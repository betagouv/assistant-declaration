import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { PasswordMutationInput } from '@ad/src/components/PasswordMutationInput';

type ComponentType = typeof PasswordMutationInput;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/PasswordMutationInput',
  component: PasswordMutationInput,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

async function playFindHints(canvasElement: HTMLElement): Promise<HTMLElement> {
  return await within(canvasElement).findByText(/contenir/i);
}

const Template: StoryFn<ComponentType> = (args) => {
  return <PasswordMutationInput {...args} label="Password" />;
};

const ValidStory = Template.bind({});
ValidStory.args = {
  nativeInputProps: {
    value: 'Mypassword@1',
  },
};
ValidStory.parameters = {};
ValidStory.play = async ({ canvasElement }) => {
  await playFindHints(canvasElement);
};

export const Valid = prepareStory(ValidStory);

const IncompleteStory = Template.bind({});
IncompleteStory.args = {
  nativeInputProps: {
    value: 'Hola',
  },
};
IncompleteStory.parameters = {};
IncompleteStory.play = async ({ canvasElement }) => {
  await playFindHints(canvasElement);
};

export const Incomplete = prepareStory(IncompleteStory);

const InvalidStory = Template.bind({});
InvalidStory.args = {
  error: 'erreur aléatoire',
  nativeInputProps: {
    value: 'Hola',
  },
};
InvalidStory.parameters = {};
InvalidStory.play = async ({ canvasElement }) => {
  await playFindHints(canvasElement);
};

export const Invalid = prepareStory(InvalidStory);

const EmptyStory = Template.bind({});
EmptyStory.args = {
  nativeInputProps: {
    value: '',
  },
};
EmptyStory.parameters = {};
EmptyStory.play = async ({ canvasElement }) => {
  await playFindHints(canvasElement);
};

export const Empty = prepareStory(EmptyStory);
