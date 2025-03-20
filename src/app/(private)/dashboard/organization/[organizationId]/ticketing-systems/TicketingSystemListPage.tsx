'use client';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { useCallback } from 'react';

import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { TicketingSystemCard } from '@ad/src/components/TicketingSystemCard';
import { centeredAlertContainerGridProps, centeredContainerGridProps, ulComponentResetStyles } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export interface TicketingSystemListPageProps {
  params: { organizationId: string };
}

export function TicketingSystemListPage({ params: { organizationId } }: TicketingSystemListPageProps) {
  const disconnectTicketingSystem = trpc.disconnectTicketingSystem.useMutation();

  const disconnectTicketingSystemAction = useCallback(
    async (ticketingSystemId: string) => {
      await disconnectTicketingSystem.mutateAsync({
        ticketingSystemId: ticketingSystemId,
      });

      push(['trackEvent', 'ticketing', 'disconnect']);
    },
    [disconnectTicketingSystem]
  );

  const listTicketingSystems = trpc.listTicketingSystems.useQuery({
    orderBy: {},
    filterBy: {
      organizationIds: [organizationId],
    },
  });

  const aggregatedQueries = new AggregatedQueries(listTicketingSystems);

  const ticketingSystems = listTicketingSystems.data?.ticketingSystems || [];

  if (aggregatedQueries.hasError) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
      </Grid>
    );
  } else if (aggregatedQueries.isLoading) {
    return <LoadingArea ariaLabelTarget="page" />;
  }

  return (
    <>
      <Grid container {...centeredContainerGridProps} alignContent="flex-start">
        <Grid container spacing={1} sx={{ pb: 3 }}>
          <Grid item xs={12} md={7} sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography component="h1" variant="h5">
              Mes billetteries connectées
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
            <Button
              component={NextLink}
              href={linkRegistry.get('ticketingSystemConnection', { organizationId: organizationId })}
              size="large"
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
            >
              Connecter une billetterie
            </Button>
          </Grid>
        </Grid>
        {ticketingSystems.length ? (
          <Grid container component="ul" spacing={3} sx={ulComponentResetStyles}>
            {ticketingSystems.map((ticketingSystem) => (
              <Grid key={ticketingSystem.id} item component="li" xs={12} sm={6}>
                <TicketingSystemCard ticketingSystem={ticketingSystem} disconnectAction={() => disconnectTicketingSystemAction(ticketingSystem.id)} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid item xs={12}>
            <Typography variant="body2">Aucune billetterie n&apos;est pour l&apos;instant connectée</Typography>
          </Grid>
        )}
      </Grid>
    </>
  );
}
