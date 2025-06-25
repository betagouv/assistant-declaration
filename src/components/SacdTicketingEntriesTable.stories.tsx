import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { SacdTicketingEntriesTable } from '@ad/src/components/SacdTicketingEntriesTable';
import { sacdDeclarations } from '@ad/src/fixtures/declaration/sacd';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';

type ComponentType = typeof SacdTicketingEntriesTable;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/SacdTicketingEntriesTable',
  component: SacdTicketingEntriesTable,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <SacdTicketingEntriesTable {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  wrappers: eventsWrappers,
  audience: sacdDeclarations[0].audience,
  taxRate: eventsSeries[0].taxRate,
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);
