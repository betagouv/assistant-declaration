import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { CreateOrganizationForm } from '@ad/src/app/(private)/dashboard/organization/create/CreateOrganizationForm';
import { organizations } from '@ad/src/fixtures/organization';
import { CreateOrganizationPrefillSchema } from '@ad/src/models/actions/organization';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof CreateOrganizationForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();
export default {
  title: 'Forms/CreateOrganization',
  component: CreateOrganizationForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['createOrganization'],
        response: {
          organization: organizations[0],
        },
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <CreateOrganizationForm {...args} />;
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
  prefill: CreateOrganizationPrefillSchema.parse({
    name: 'Ma salle de spectacle',
    officialHeadquartersId: '12345678900011',
  }),
};
FilledStory.parameters = { ...defaultMswParameters };
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);
