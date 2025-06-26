import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { ConnectTicketingSystemForm } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/ConnectTicketingSystemForm';
import { organizations } from '@ad/src/fixtures/organization';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';
import { ConnectTicketingSystemPrefillSchema } from '@ad/src/models/actions/ticketing';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof ConnectTicketingSystemForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();
export default {
  title: 'Forms/ConnectTicketingSystem',
  component: ConnectTicketingSystemForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['connectTicketingSystem'],
        response: {
          ticketingSystem: ticketingSystems[0],
        },
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <ConnectTicketingSystemForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {
  prefill: {
    organizationId: organizations[0].id,
  },
};
EmptyStory.parameters = { ...defaultMswParameters };
EmptyStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Empty = prepareStory(EmptyStory);

const FilledStory = Template.bind({});
FilledStory.args = {
  prefill: ConnectTicketingSystemPrefillSchema.parse({
    organizationId: organizations[0].id,
    ticketingSystemName: 'BILLETWEB',
    apiAccessKey: '123456789',
    apiSecretKey: '123456789',
  }),
};
FilledStory.parameters = { ...defaultMswParameters };
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);
