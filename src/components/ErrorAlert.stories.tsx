import { Meta, StoryFn } from '@storybook/react';
import { TRPCClientError } from '@trpc/client';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindAlert } from '@ad/.storybook/testing';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { BusinessError } from '@ad/src/models/entities/errors';

type ComponentType = typeof ErrorAlert;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/ErrorAlert',
  component: ErrorAlert,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <ErrorAlert {...args} />;
};

const OneErrorStory = Template.bind({});
OneErrorStory.args = {
  errors: [new Error('this is an error')],
};
OneErrorStory.play = async ({ canvasElement }) => {
  await playFindAlert(canvasElement);
};

export const OneError = prepareStory(OneErrorStory);

const MultipleErrorsStory = Template.bind({});
MultipleErrorsStory.args = {
  errors: [
    new BusinessError('firstError', 'this is the first error'),
    new BusinessError('secondError', 'this is the second error'),
    new Error('duplicated error is shown once'),
    new Error('duplicated error is shown once'),
  ],
};
MultipleErrorsStory.play = async ({ canvasElement }) => {
  await playFindAlert(canvasElement);
};

export const MultipleErrors = prepareStory(MultipleErrorsStory);

const WithRetryStory = Template.bind({});
WithRetryStory.args = {
  errors: [new TRPCClientError('Error for test')],
  refetchs: [() => Promise.resolve()],
};
WithRetryStory.play = async ({ canvasElement }) => {
  await playFindAlert(canvasElement);
};

export const WithRetry = prepareStory(WithRetryStory);
