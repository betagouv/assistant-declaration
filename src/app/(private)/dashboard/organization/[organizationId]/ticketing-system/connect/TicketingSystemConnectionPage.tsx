'use client';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { createContext, useContext } from 'react';

import { ConnectTicketingSystemForm } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/ConnectTicketingSystemForm';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredFormContainerGridProps } from '@ad/src/utils/grid';

export const TicketingSystemConnectionPageContext = createContext({
  ContextualConnectTicketingSystemForm: ConnectTicketingSystemForm,
});

export function TicketingSystemConnectionPage() {
  const { ContextualConnectTicketingSystemForm } = useContext(TicketingSystemConnectionPageContext);

  return (
    <Grid container {...centeredFormContainerGridProps}>
      <Typography component="h1" {...formTitleProps}>
        Connecter un système de billetterie
      </Typography>
      <ContextualConnectTicketingSystemForm />
    </Grid>
  );
}
