import { Meta, StoryFn } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { SacemExpensesTable } from '@ad/src/components/SacemExpensesTable';
import { sacemDeclarations } from '@ad/src/fixtures/declaration/sacem';
import { FillSacemDeclarationSchemaType } from '@ad/src/models/actions/declaration';

type ComponentType = typeof SacemExpensesTable;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/SacemExpensesTable',
  component: SacemExpensesTable,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const { control } = useForm<FillSacemDeclarationSchemaType>({
    defaultValues: {
      expenses: sacemDeclarations[0].expenses,
    },
  });

  return <SacemExpensesTable {...args} control={control} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);
