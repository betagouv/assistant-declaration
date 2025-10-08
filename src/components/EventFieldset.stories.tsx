import { Meta, StoryFn } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { EventFieldset } from '@ad/src/components/EventFieldset';
import { declarations } from '@ad/src/fixtures/declaration/common';
import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';

type ComponentType = typeof EventFieldset;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventFieldset',
  component: EventFieldset,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const { control } = useForm<FillDeclarationSchemaType>({
    defaultValues: {
      events: declarations[0].events,
    },
  });

  return <EventFieldset {...args} control={control} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);
