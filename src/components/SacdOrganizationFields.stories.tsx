import { Grid } from '@mui/material';
import { Meta, StoryFn } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { SacdOrganizationFields } from '@ad/src/components/SacdOrganizationFields';
import { sacdDeclarations, sacdDeclarationsWrappers } from '@ad/src/fixtures/declaration/sacd';
import { FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';

type ComponentType = typeof SacdOrganizationFields;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/SacdOrganizationFields',
  component: SacdOrganizationFields,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const { control } = useForm<FillSacdDeclarationSchemaType>({
    defaultValues: {
      producer: {
        ...sacdDeclarations[0].producer,
        headquartersAddress: {
          // To not have the "id" key
          street: sacdDeclarations[0].producer.headquartersAddress.street,
          city: sacdDeclarations[0].producer.headquartersAddress.city,
          postalCode: sacdDeclarations[0].producer.headquartersAddress.postalCode,
          countryCode: sacdDeclarations[0].producer.headquartersAddress.countryCode,
          subdivision: sacdDeclarations[0].producer.headquartersAddress.subdivision,
        },
      },
    },
  });

  return (
    <Grid container spacing={2}>
      <SacdOrganizationFields {...args} control={control} />
    </Grid>
  );
};

const NormalStory = Template.bind({});
NormalStory.args = {
  organizationType: 'producer',
  placeholder: sacdDeclarationsWrappers[0].placeholder.producer,
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findAllByRole('combobox');
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
  await within(canvasElement).findAllByRole('combobox');
};

export const Readonly = prepareStory(ReadonlyStory);
