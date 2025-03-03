'use client';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { createContext, useContext } from 'react';

import { CreateOrganizationForm } from '@ad/src/app/(private)/dashboard/organization/create/CreateOrganizationForm';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredFormContainerGridProps } from '@ad/src/utils/grid';

export const OrganizationCreationPageContext = createContext({
  ContextualCreateOrganizationForm: CreateOrganizationForm,
});

export function OrganizationCreationPage() {
  const { ContextualCreateOrganizationForm } = useContext(OrganizationCreationPageContext);

  return (
    <Grid container {...centeredFormContainerGridProps}>
      <Typography component="h1" {...formTitleProps}>
        Créer une organisation
      </Typography>
      <ContextualCreateOrganizationForm />
    </Grid>
  );
}
