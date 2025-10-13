import { Meta, StoryFn } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { EventFieldset } from '@ad/src/components/EventFieldset';
import { declarations, declarationsWrappers, eventsWithPlace } from '@ad/src/fixtures/declaration/common';
import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';

import { events } from '../fixtures/event';

type ComponentType = typeof EventFieldset;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventFieldset',
  component: EventFieldset,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const eventsInputs: FillDeclarationSchemaType['events'] = eventsWithPlace.map((event) => {
  return {
    ...event,
    placeOverride: event.placeOverride ?? {
      name: null,
      address: null,
    },
  };
});

const Template: StoryFn<ComponentType> = (args) => {
  const { control, register, setValue, watch, trigger } = useForm<FillDeclarationSchemaType>({
    defaultValues: {
      events: eventsInputs,
    },
  });

  return (
    <EventFieldset
      {...args}
      control={control}
      register={register}
      setValue={setValue}
      watch={watch}
      trigger={trigger}
      eventIndex={0}
      name={`events.0`}
      placeholder={declarationsWrappers[0].placeholder}
      errors={undefined}
      readonly={false}
    />
  );
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);
