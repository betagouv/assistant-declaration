import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';
import { useForm } from 'react-hook-form';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { SacemRevenuesTable } from '@ad/src/components/SacemRevenuesTable';
import { sacemDeclarations } from '@ad/src/fixtures/declaration/sacem';
import { FillSacemDeclarationSchemaType } from '@ad/src/models/actions/declaration';

type ComponentType = typeof SacemRevenuesTable;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/SacemRevenuesTable',
  component: SacemRevenuesTable,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const { control } = useForm<FillSacemDeclarationSchemaType>({
    defaultValues: {
      revenues: sacemDeclarations[0].revenues,
    },
  });

  return <SacemRevenuesTable {...args} control={control} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('grid');
};

export const Normal = prepareStory(NormalStory);
