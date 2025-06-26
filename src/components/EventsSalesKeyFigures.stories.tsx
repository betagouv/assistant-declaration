import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { EventsSalesKeyFigures } from '@ad/src/components/EventsSalesKeyFigures';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';

type ComponentType = typeof EventsSalesKeyFigures;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventsSalesKeyFigures',
  component: EventsSalesKeyFigures,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <EventsSalesKeyFigures {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  wrappers: eventsWrappers,
  eventSerie: eventsSeries[0],
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('textbox', {
    name: /date/i,
  });
};

export const Normal = prepareStory(NormalStory);

const WithRoundedValuesOnCopyStory = Template.bind({});
WithRoundedValuesOnCopyStory.args = {
  ...NormalStory.args,
  roundValuesForCopy: true,
};
WithRoundedValuesOnCopyStory.parameters = {
  ...NormalStory.parameters,
};
WithRoundedValuesOnCopyStory.play = NormalStory.play;

export const WithRoundedValuesOnCopy = prepareStory(WithRoundedValuesOnCopyStory);
