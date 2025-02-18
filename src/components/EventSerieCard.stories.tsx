import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { EventSerieCard } from '@ad/src/components/EventSerieCard';
import { eventsSeriesWrappers } from '@ad/src/fixtures/event';

type ComponentType = typeof EventSerieCard;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventSerieCard',
  component: EventSerieCard,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <EventSerieCard {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  wrapper: eventsSeriesWrappers[0],
  sacemDeclarationLink: '',
  sacdDeclarationLink: '',
  astpDeclarationLink: '',
  cnmDeclarationLink: '',
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('button', {
    name: /sacem/i,
  });
};

export const Normal = prepareStory(NormalStory);
