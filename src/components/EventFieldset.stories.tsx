import { Meta, StoryFn } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { within } from 'storybook/test';
import { z } from 'zod';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { EventFieldset } from '@ad/src/components/EventFieldset';
import { declarationsWrappers, eventsWithPlace } from '@ad/src/fixtures/declaration/common';
import { FillDeclarationSchema } from '@ad/src/models/actions/declaration';

type ComponentType = typeof EventFieldset;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventFieldset',
  component: EventFieldset,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

type FillDeclarationSchemaInputType = z.input<typeof FillDeclarationSchema>;

const eventsInputs: FillDeclarationSchemaInputType['events'] = eventsWithPlace.map((event) => {
  return {
    ...event,
    placeOverride: event.placeOverride ?? {
      name: null,
      address: null,
    },
  };
});

const Template: StoryFn<ComponentType> = (args) => {
  const { control, register, setValue, watch, trigger } = useForm<FillDeclarationSchemaInputType>({
    defaultValues: {
      eventSerie: {
        expectedDeclarationTypes: [],
      },
      events: eventsInputs,
    },
  });

  return (
    <div>
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
    </div>
  );
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('heading', {
    level: 2,
    name: /séance/i,
  });
};

export const Normal = prepareStory(NormalStory);
