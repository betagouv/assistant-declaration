import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { RetrievePasswordForm } from '@ad/src/app/(visitor-only)/auth/password/retrieve/RetrievePasswordForm';
import { RequestNewPasswordPrefillSchema } from '@ad/src/models/actions/auth';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof RetrievePasswordForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Forms/RetrievePassword',
  component: RetrievePasswordForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['requestNewPassword'],
        response: undefined,
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <RetrievePasswordForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {};
EmptyStory.parameters = { ...defaultMswParameters };
EmptyStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Empty = prepareStory(EmptyStory);

const FilledStory = Template.bind({});
FilledStory.args = {
  prefill: RequestNewPasswordPrefillSchema.parse({
    email: 'jean@france.fr',
  }),
};
FilledStory.parameters = { ...defaultMswParameters };
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);
