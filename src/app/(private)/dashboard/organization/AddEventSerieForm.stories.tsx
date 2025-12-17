import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { AddEventSerieForm } from '@ad/src/app/(private)/dashboard/organization/AddEventSerieForm';
import { events, eventsSeries } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';
import { AddEventSeriePrefillSchema } from '@ad/src/models/actions/event';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof AddEventSerieForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();
export default {
  title: 'Forms/AddEventSerie',
  component: AddEventSerieForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['addEventSerie'],
        response: undefined,
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <AddEventSerieForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {
  onSuccess: () => {},
  prefill: AddEventSeriePrefillSchema.parse({
    ticketingSystemId: ticketingSystems[0].id,
    organizationId: organizations[0].id,
  }),
};
EmptyStory.parameters = { ...defaultMswParameters };
EmptyStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Empty = prepareStory(EmptyStory);

const FilledStory = Template.bind({});
FilledStory.args = {
  ...EmptyStory.args,
  prefill: AddEventSeriePrefillSchema.parse({
    ticketingSystemId: ticketingSystems[0].id,
    organizationId: organizations[0].id,
    name: eventsSeries[0].name,
    events: [
      { startAt: events[0].startAt, endAt: events[0].endAt },
      { startAt: events[1].startAt, endAt: events[1].endAt },
    ],
  }),
};
FilledStory.parameters = { ...defaultMswParameters };
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);
