'use client';

import { Grid, Typography } from '@mui/material';
import { useContext } from 'react';

import { TicketingSystemConnectionPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/TicketingSystemConnectionPageContext';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredFormContainerGridProps } from '@ad/src/utils/grid';

export interface TicketingSystemConnectionPageProps {
  params: { organizationId: string };
}

export function TicketingSystemConnectionPage({ params: { organizationId } }: TicketingSystemConnectionPageProps) {
  const { ContextualConnectTicketingSystemForm } = useContext(TicketingSystemConnectionPageContext);

  return (
    <Grid container {...centeredFormContainerGridProps}>
      <Typography component="h1" {...formTitleProps}>
        Connecter une billetterie
      </Typography>
      <ContextualConnectTicketingSystemForm prefill={{ organizationId: organizationId }} />
    </Grid>
  );
}
