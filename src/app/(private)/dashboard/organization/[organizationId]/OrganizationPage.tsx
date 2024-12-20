'use client';

import { LoadingButton as Button } from '@mui/lab';
import { Alert, Typography } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { isBefore, subHours } from 'date-fns';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventSerieCard } from '@ad/src/components/EventSerieCard';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export interface OrganizationPageProps {
  params: { organizationId: string };
}

export function OrganizationPage({ params: { organizationId } }: OrganizationPageProps) {
  const { t } = useTranslation('common');

  const getOrganization = trpc.getOrganization.useQuery({
    id: organizationId,
  });

  const listTicketingSystems = trpc.listTicketingSystems.useQuery({
    orderBy: {},
    filterBy: {
      organizationIds: [organizationId],
    },
  });

  const listEventsSeries = trpc.listEventsSeries.useQuery({
    orderBy: {},
    filterBy: {
      organizationIds: [organizationId],
    },
  });

  const aggregatedQueries = new AggregatedQueries(getOrganization, listTicketingSystems, listEventsSeries);

  const synchronizeDataFromTicketingSystems = trpc.synchronizeDataFromTicketingSystems.useMutation();

  const lastSynchronizationAt: Date | null = useMemo(() => {
    let oldestDate: Date | null = null;

    if (listTicketingSystems.data) {
      for (const ticketingSystem of listTicketingSystems.data.ticketingSystems) {
        if (oldestDate === null || (ticketingSystem.lastSynchronizationAt && ticketingSystem.lastSynchronizationAt < oldestDate)) {
          oldestDate = ticketingSystem.lastSynchronizationAt;
        }
      }
    }

    return oldestDate;
  }, [listTicketingSystems.data]);

  const lastSynchronizationTooOld: boolean = useMemo(() => {
    const thresholdDate = subHours(new Date(), 24);

    return lastSynchronizationAt ? isBefore(lastSynchronizationAt, thresholdDate) : true;
  }, [lastSynchronizationAt]);

  if (aggregatedQueries.isLoading) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (aggregatedQueries.hasError) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
      </Grid>
    );
  }

  const organization = getOrganization.data!.organization;
  const ticketingSystems = listTicketingSystems.data!.ticketingSystems;
  const eventsSeriesWrappers = listEventsSeries.data!.eventsSeriesWrappers;

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        py: 3,
      }}
    >
      {ticketingSystems.length > 0 ? (
        <>
          <Grid item xs={12} sx={{ pb: 3 }}>
            <Typography component="h1" variant="h5">
              Séries de représentations
            </Typography>
          </Grid>
          <Grid container spacing={2} justifyContent="center" sx={{ pt: 3 }}>
            <>
              {lastSynchronizationAt !== null ? (
                <>
                  {lastSynchronizationTooOld ? (
                    <Grid item xs={12} sx={{ py: 2 }}>
                      <Alert severity="warning">
                        La dernière synchronisation date d&apos;{t('date.ago', { date: lastSynchronizationAt })}. Il est fortement recommandé de
                        resynchroniser vos données avant de faire une déclaration.
                      </Alert>
                    </Grid>
                  ) : (
                    <Grid item xs={12} sx={{ py: 2 }}>
                      <Alert severity="info">
                        Vous avez synchronisé vos données de billeterie {t('date.relative', { date: lastSynchronizationAt })}.
                      </Alert>
                    </Grid>
                  )}
                  {synchronizeDataFromTicketingSystems.error && (
                    <Grid item xs={12} sx={{ py: 2 }}>
                      <ErrorAlert errors={[synchronizeDataFromTicketingSystems.error]} />
                    </Grid>
                  )}
                  <Grid item xs={12} sx={{ py: 2 }}>
                    <Button
                      onClick={async () => {
                        await synchronizeDataFromTicketingSystems.mutateAsync({
                          organizationId: organization.id,
                        });
                      }}
                      loading={synchronizeDataFromTicketingSystems.isLoading}
                      size="large"
                      variant="contained"
                    >
                      Synchroniser les données
                    </Button>
                  </Grid>
                  {eventsSeriesWrappers.length > 0 ? (
                    <Grid item xs={12} sx={{ py: 2 }}>
                      <Grid container spacing={2} justifyContent="center" alignItems="center">
                        {eventsSeriesWrappers.map((eventsSeriesWrapper) => {
                          return (
                            <Grid key={eventsSeriesWrapper.serie.id} item xs={12} lg={8} sx={{ mx: 'auto' }}>
                              <EventSerieCard
                                wrapper={eventsSeriesWrapper}
                                sacemDeclarationLink={linkRegistry.get('declaration', {
                                  organizationId: organizationId,
                                  eventSerieId: eventsSeriesWrapper.serie.id,
                                  declarationType: 'sacem',
                                })}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Grid>
                  ) : (
                    <Grid item xs={12} sx={{ py: 2 }}>
                      Aucune série de représentations n&apos;a été trouvée dans votre billetterie.
                    </Grid>
                  )}
                </>
              ) : (
                <>
                  <Grid item xs={12} sx={{ py: 2 }}>
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      Veuillez synchroniser les données de votre billetterie pour débuter vos déclarations.{' '}
                      <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 600 }}>
                        À noter que pour la première synchronisation cette opération peut durer jusqu&apos;à 1 minute.
                      </Typography>
                    </Alert>
                  </Grid>
                  <Button
                    onClick={async () => {
                      await synchronizeDataFromTicketingSystems.mutateAsync({
                        organizationId: organization.id,
                      });
                    }}
                    loading={synchronizeDataFromTicketingSystems.isLoading}
                    size="large"
                    variant="contained"
                  >
                    Synchroniser les données
                  </Button>
                </>
              )}
            </>
          </Grid>
        </>
      ) : (
        <>
          <Alert severity="error">
            Aucun système de billetterie n&apos;est actuellement connecté à votre organisation.{' '}
            <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 600 }}>
              Veuillez contacter notre support pour corriger cela et ainsi commencer vos déclarations.
            </Typography>
          </Alert>
        </>
      )}
    </Container>
  );
}
