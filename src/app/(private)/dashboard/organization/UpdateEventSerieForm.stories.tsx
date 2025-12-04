import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm } from '@ad/.storybook/testing';
import { UpdateEventSerieForm } from '@ad/src/app/(private)/dashboard/organization/UpdateEventSerieForm';
import { events, eventsSeries } from '@ad/src/fixtures/event';
import { UpdateEventSeriePrefillSchema } from '@ad/src/models/actions/event';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof UpdateEventSerieForm;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();
export default {
  title: 'Forms/UpdateEventSerie',
  component: UpdateEventSerieForm,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['updateEventSerie'],
        response: undefined,
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <UpdateEventSerieForm {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {
  onSuccess: () => {},
  prefill: UpdateEventSeriePrefillSchema.parse({
    eventSerieId: eventsSeries[0].id,
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
  prefill: UpdateEventSeriePrefillSchema.parse({
    eventSerieId: eventsSeries[0].id,
    name: eventsSeries[0].name,
    events: [
      { id: events[0].id, startAt: events[0].startAt, endAt: events[0].endAt },
      { id: events[1].id, startAt: events[1].startAt, endAt: events[1].endAt },
      { id: null, startAt: events[1].startAt, endAt: events[1].endAt },
    ],
  }),
};
FilledStory.parameters = { ...defaultMswParameters };
FilledStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Filled = prepareStory(FilledStory);
