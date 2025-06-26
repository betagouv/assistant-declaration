import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { ErrorCellWrapper } from '@ad/src/components/ErrorCellWrapper';

type ComponentType = typeof ErrorCellWrapper;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/ErrorCellWrapper',
  component: ErrorCellWrapper,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <ErrorCellWrapper {...args}>+1 (132) 323 abc</ErrorCellWrapper>;
};

const WithErrorStory = Template.bind({});
WithErrorStory.args = {
  errorMessage: 'something is wrong',
};
WithErrorStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/abc/i, {
    selector: '[aria-invalid="true"]',
  });
};

export const WithError = prepareStory(WithErrorStory);

const NoErrorStory = Template.bind({});
NoErrorStory.args = {
  errorMessage: undefined,
};
NoErrorStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/abc/i, {
    ignore: '[aria-invalid="true"]',
  });
};

export const NoError = prepareStory(NoErrorStory);
