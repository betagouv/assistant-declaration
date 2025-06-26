import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { EventsSalesOverview } from '@ad/src/components/EventsSalesOverview';
import { eventCategoryTickets, eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof EventsSalesOverview;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventsSalesOverview',
  component: EventsSalesOverview,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <EventsSalesOverview {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  wrappers: eventsWrappers,
  eventSerie: eventsSeries[0],
};
NormalStory.parameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'mutation',
        path: ['updateEventCategoryTickets'],
        response: {
          eventCategoryTickets: eventCategoryTickets[0],
        },
      }),
    ],
  },
};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/données/i);
};

export const Normal = prepareStory(NormalStory);
