import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';
import { useForm } from 'react-hook-form';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { SacdAccountingEntriesTable } from '@ad/src/components/SacdAccountingEntriesTable';
import { sacdDeclarations } from '@ad/src/fixtures/declaration/sacd';
import { FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';

type ComponentType = typeof SacdAccountingEntriesTable;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/SacdAccountingEntriesTable',
  component: SacdAccountingEntriesTable,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const { control } = useForm<FillSacdDeclarationSchemaType>({
    defaultValues: {
      accountingEntries: sacdDeclarations[0].accountingEntries,
    },
  });

  return <SacdAccountingEntriesTable {...args} control={control} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);
