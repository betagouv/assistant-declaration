import { Meta, StoryFn } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { SacdPerformedWorksTable } from '@ad/src/components/SacdPerformedWorksTable';
import { sacdDeclarations, sacdDeclarationsWrappers } from '@ad/src/fixtures/declaration/sacd';
import { FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';

type ComponentType = typeof SacdPerformedWorksTable;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/SacdPerformedWorksTable',
  component: SacdPerformedWorksTable,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const { control } = useForm<FillSacdDeclarationSchemaType>({
    defaultValues: {
      performedWorks: sacdDeclarations[0].performedWorks,
    },
  });

  return <SacdPerformedWorksTable {...args} control={control} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  placeholder: sacdDeclarationsWrappers[0].placeholder.performedWorksOptions,
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);

const ReadonlyStory = Template.bind({});
ReadonlyStory.args = {
  ...NormalStory.args,
  readonly: true,
};
ReadonlyStory.parameters = {
  ...NormalStory.parameters,
};
ReadonlyStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Readonly = prepareStory(ReadonlyStory);
