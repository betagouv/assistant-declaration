'use client';

import { Grid, Typography } from '@mui/material';
import { useContext } from 'react';

import { OrganizationCreationPageContext } from '@ad/src/app/(private)/dashboard/organization/create/OrganizationCreationPageContext';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredFormContainerGridProps } from '@ad/src/utils/grid';

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
