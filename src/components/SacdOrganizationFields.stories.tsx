import { Grid } from '@mui/material';
import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';
import { useForm } from 'react-hook-form';

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
      organizer: {
        ...sacdDeclarations[0].organizer,
        headquartersAddress: {
          // To not have the "id" key
          street: sacdDeclarations[0].organizer.headquartersAddress.street,
          city: sacdDeclarations[0].organizer.headquartersAddress.city,
          postalCode: sacdDeclarations[0].organizer.headquartersAddress.postalCode,
          countryCode: sacdDeclarations[0].organizer.headquartersAddress.countryCode,
          subdivision: sacdDeclarations[0].organizer.headquartersAddress.subdivision,
        },
        phone: {
          // To not have the "id" key
          callingCode: sacdDeclarations[0].organizer.phone.callingCode,
          countryCode: sacdDeclarations[0].organizer.phone.countryCode,
          number: sacdDeclarations[0].organizer.phone.number,
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
  organizationType: 'organizer',
  placeholder: sacdDeclarationsWrappers[0].placeholder.organizer,
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findAllByRole('combobox');
};

export const Normal = prepareStory(NormalStory);
