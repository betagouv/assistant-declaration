import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Empty as UpdateEventSerieFormEmptyStory } from '@ad/src/app/(private)/dashboard/organization/UpdateEventSerieForm.stories';
import { EventSerieCard } from '@ad/src/components/EventSerieCard';
import { EventSerieCardContext } from '@ad/src/components/EventSerieCardContext';
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
  declarationLink: '', // Despite using this `next/link` will go to the story iframe (no solution, tried hash, replace...)
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/feu/i);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: EventSerieCardContext,
    value: {
      ContextualUpdateEventSerieForm: UpdateEventSerieFormEmptyStory,
    },
  },
});

const EditableStory = Template.bind({});
EditableStory.args = {
  ...NormalStory.args,
  wrapper: { ...eventsSeriesWrappers[0], partialDeclarations: [] }, // Make sure it's seen as editable
  onUpdate: async () => {},
  onRemove: async () => {},
};
EditableStory.parameters = {};
EditableStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/feu/i);
};

export const Editable = prepareStory(EditableStory, {
  childrenContext: {
    context: EventSerieCardContext,
    value: {
      ContextualUpdateEventSerieForm: UpdateEventSerieFormEmptyStory,
    },
  },
});

const NotLongerEditableStory = Template.bind({});
NotLongerEditableStory.args = {
  ...EditableStory.args,
  wrapper: eventsSeriesWrappers[0],
};
NotLongerEditableStory.parameters = {};
NotLongerEditableStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/feu/i);
};

export const NotLongerEditable = prepareStory(NotLongerEditableStory, {
  childrenContext: {
    context: EventSerieCardContext,
    value: {
      ContextualUpdateEventSerieForm: UpdateEventSerieFormEmptyStory,
    },
  },
});
