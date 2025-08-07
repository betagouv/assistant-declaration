import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { UpdateTicketingSystemForm } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-systems/UpdateTicketingSystemForm';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';
import { UpdateTicketingSystemPrefillSchema } from '@ad/src/models/actions/ticketing';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof UpdateTicketingSystemForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();
export default {
  title: 'Forms/UpdateTicketingSystem',
  component: UpdateTicketingSystemForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['updateTicketingSystem'],
        response: {
          ticketingSystem: ticketingSystems[0],
          pushStrategyToken: undefined,
        },
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <UpdateTicketingSystemForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {
  ticketingSystem: ticketingSystems[0],
};
EmptyStory.parameters = { ...defaultMswParameters };
EmptyStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Empty = prepareStory(EmptyStory);

const FilledStory = Template.bind({});
FilledStory.args = {
  ticketingSystem: ticketingSystems[0],
  prefill: UpdateTicketingSystemPrefillSchema.parse({
    pullStrategyCredentials: {
      apiAccessKey: '123456789',
      apiSecretKey: '123456789',
    },
  }),
};
FilledStory.parameters = { ...defaultMswParameters };
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);
