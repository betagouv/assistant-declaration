import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { EventSalesTable } from '@ad/src/components/EventSalesTable';
import { eventsWrappers } from '@ad/src/fixtures/event';

type ComponentType = typeof EventSalesTable;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventSalesTable',
  component: EventSalesTable,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <EventSalesTable {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  wrapper: {
    ...eventsWrappers[0],
    sales: eventsWrappers[0].sales.map((s) => {
      // Make sure there is no override
      return {
        ...s,
        eventCategoryTickets: {
          ...s.eventCategoryTickets,
          totalOverride: null,
          priceOverride: null,
        },
      };
    }),
  },
  onRowUpdate: async () => {},
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);

const ErroringUpdateStory = Template.bind({});
ErroringUpdateStory.args = {
  ...NormalStory.args,
  onRowUpdate: async () => {
    throw 1;
  },
};
ErroringUpdateStory.parameters = {
  ...NormalStory.parameters,
};
ErroringUpdateStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const ErroringUpdate = prepareStory(ErroringUpdateStory);

const OverridesStory = Template.bind({});
OverridesStory.args = {
  wrapper: eventsWrappers[0],
  onRowUpdate: async () => {},
};
OverridesStory.parameters = {
  ...NormalStory.parameters,
};
OverridesStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Overrides = prepareStory(OverridesStory);
