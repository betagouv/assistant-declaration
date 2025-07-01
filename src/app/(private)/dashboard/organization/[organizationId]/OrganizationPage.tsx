'use client';

import { Sync } from '@mui/icons-material';
import { Alert, Button, Container, Grid, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import { isAfter, isBefore, subHours, subMonths } from 'date-fns';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsyncFn } from 'react-use';

import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventSerieCard } from '@ad/src/components/EventSerieCard';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { SynchronizeDataFromTicketingSystemsSchemaType } from '@ad/src/models/actions/event';
import { CustomError, internalServerErrorError } from '@ad/src/models/entities/errors';
import { mockBaseUrl, shouldTargetMock } from '@ad/src/server/mock/environment';
import { CHUNK_DATA_PREFIX, CHUNK_ERROR_PREFIX, CHUNK_PING_PREFIX } from '@ad/src/utils/api';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';
import { getBaseUrl } from '@ad/src/utils/url';

const textDecoder = new TextDecoder();

export enum ListFilter {
  ALL = 1,
  ARCHIVED_ONLY,
  ENDED_ONLY,
  CURRENT_ONLY,
  FUTURE_ONLY,
}

export interface OrganizationPageProps {
  params: { organizationId: string };
}

export function OrganizationPage({ params: { organizationId } }: OrganizationPageProps) {
  const { t } = useTranslation('common');

  const trpcUtils = trpc.useUtils();

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

  // This custom stream logic is due to Scalingo timing out long-running requests
  const [synchronizeDataFromTicketingSystems, synchronizeDataFromTicketingSystemsTrigger] = useAsyncFn(
    async (input: SynchronizeDataFromTicketingSystemsSchemaType) => {
      const response = await fetch(`${shouldTargetMock ? mockBaseUrl : getBaseUrl()}/api/synchronize-data-from-ticketing-systems`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (response.status !== 200) {
        throw internalServerErrorError;
      }

      assert(response.body);

      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // A chunk may include multiple lines from multiple `res.write()`, so having to take this into acocunt
        let buffer = textDecoder.decode(value, { stream: true });
        let firstNewLine: number;

        while ((firstNewLine = buffer.indexOf('\n')) !== -1) {
          // Maybe it was not the "\n" of the ending chunk line, maybe it was
          const chunkLine = buffer.substring(0, firstNewLine);
          buffer = buffer.substring(firstNewLine + 1);

          // As explained into `src/utils/api.ts` we have to manage our own protocol to handle errors properly
          if (chunkLine.startsWith(CHUNK_DATA_PREFIX)) {
            const rawChunk = chunkLine.substring(CHUNK_DATA_PREFIX.length).trim();

            if (rawChunk === 'done') {
              // It has worked, we need to refresh data (usually a mutation success would do it)
              trpcUtils.invalidate();
            }
          } else if (chunkLine.startsWith(CHUNK_PING_PREFIX)) {
            // Meaningless, just to prevent the provider not timing out due to long-running request
          } else if (chunkLine.startsWith(CHUNK_ERROR_PREFIX)) {
            const rawError = chunkLine.substring(CHUNK_ERROR_PREFIX.length).trim();
            const jsonError = JSON.parse(rawError);

            throw !!jsonError.code && !!jsonError.message ? new CustomError(jsonError.code, jsonError.message) : internalServerErrorError;
          } else {
            throw new Error(`the chunk line "${chunkLine}" is not handled`);
          }
        }
      }
    }
  );

  const [listFilter, setListFilter] = useState<ListFilter>(ListFilter.ENDED_ONLY);

  const filteredEventsSeriesWrappers = useMemo(() => {
    const currentDate = new Date();
    const archivedThreshold = subMonths(currentDate, 3);

    return (listEventsSeries.data?.eventsSeriesWrappers || []).filter((eventSerieWrapper) => {
      switch (listFilter) {
        case ListFilter.ARCHIVED_ONLY:
          return isBefore(eventSerieWrapper.serie.endAt, archivedThreshold);
        case ListFilter.ENDED_ONLY:
          return isBefore(eventSerieWrapper.serie.endAt, currentDate) && !isBefore(eventSerieWrapper.serie.endAt, archivedThreshold);
        case ListFilter.CURRENT_ONLY:
          return isBefore(eventSerieWrapper.serie.startAt, currentDate) && !isBefore(eventSerieWrapper.serie.endAt, currentDate);
        case ListFilter.FUTURE_ONLY:
          return !isBefore(eventSerieWrapper.serie.startAt, currentDate);
        default:
          return true;
      }
    });
  }, [listFilter, listEventsSeries.data]);

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

  if (aggregatedQueries.isPending) {
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
        py: 3,
      }}
    >
      {ticketingSystems.length > 0 ? (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3} sx={{ pb: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography component="h1" variant="h4">
                    Spectacles
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography component="p" variant="body1">
                    Synchronisez vos données, puis sélectionnez le spectacle à déclarer.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Grid item sx={{ ml: { md: 'auto' } }}>
                    <Button
                      onClick={async () => {
                        await synchronizeDataFromTicketingSystemsTrigger({
                          organizationId: organization.id,
                        });

                        push(['trackEvent', 'ticketing', 'synchronize']);
                      }}
                      loading={synchronizeDataFromTicketingSystems.loading}
                      size="large"
                      variant="contained"
                      startIcon={<Sync />}
                    >
                      Synchroniser
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={9}>
              <Grid container spacing={2} justifyContent="center">
                <>
                  {lastSynchronizationAt !== null ? (
                    <>
                      {lastSynchronizationTooOld ? (
                        <Grid item xs={12} sx={{ pb: 1 }}>
                          <Alert severity="warning">
                            La dernière synchronisation date d&apos;{t('date.ago', { date: lastSynchronizationAt })}. Il est fortement recommandé de
                            resynchroniser vos données avant de faire une déclaration.
                          </Alert>
                        </Grid>
                      ) : (
                        <Grid item xs={12} sx={{ pb: 1 }}>
                          <Alert severity="info">
                            Vous avez synchronisé vos données de billeterie {t('date.relative', { date: lastSynchronizationAt })}.
                          </Alert>
                        </Grid>
                      )}
                      {synchronizeDataFromTicketingSystems.error && (
                        <Grid item xs={12} sx={{ pb: 1 }}>
                          <ErrorAlert errors={[synchronizeDataFromTicketingSystems.error]} />
                        </Grid>
                      )}
                      <Grid item xs={12} sx={{ py: 1 }}>
                        <Grid container spacing={1} alignContent="flex-start">
                          <Grid item>
                            <ToggleButtonGroup
                              color="primary"
                              value={listFilter}
                              exclusive
                              onChange={(event, newValue) => {
                                if (newValue !== null) {
                                  setListFilter(newValue);
                                }
                              }}
                              aria-label="filtre"
                              sx={{
                                flexWrap: 'wrap',
                                button: {
                                  textTransform: 'none',
                                },
                              }}
                            >
                              <ToggleButton value={ListFilter.ALL}>Tous</ToggleButton>
                              <ToggleButton value={ListFilter.ARCHIVED_ONLY}>Archivés</ToggleButton>
                              <ToggleButton value={ListFilter.ENDED_ONLY}>Terminés</ToggleButton>
                              <ToggleButton value={ListFilter.CURRENT_ONLY}>En cours</ToggleButton>
                              <ToggleButton value={ListFilter.FUTURE_ONLY}>À venir</ToggleButton>
                            </ToggleButtonGroup>
                          </Grid>
                        </Grid>
                      </Grid>
                      {filteredEventsSeriesWrappers.length > 0 ? (
                        <Grid item xs={12} sx={{ py: 2 }}>
                          <Grid container spacing={2} justifyContent="center" alignItems="center">
                            {filteredEventsSeriesWrappers.map((eventsSeriesWrapper) => {
                              return (
                                <Grid key={eventsSeriesWrapper.serie.id} item xs={12}>
                                  <EventSerieCard
                                    wrapper={eventsSeriesWrapper}
                                    sacemDeclarationLink={linkRegistry.get('declaration', {
                                      organizationId: organizationId,
                                      eventSerieId: eventsSeriesWrapper.serie.id,
                                      declarationType: 'sacem',
                                    })}
                                    sacdDeclarationLink={linkRegistry.get('declaration', {
                                      organizationId: organizationId,
                                      eventSerieId: eventsSeriesWrapper.serie.id,
                                      declarationType: 'sacd',
                                    })}
                                    astpDeclarationLink={linkRegistry.get('declaration', {
                                      organizationId: organizationId,
                                      eventSerieId: eventsSeriesWrapper.serie.id,
                                      declarationType: 'astp',
                                    })}
                                    cnmDeclarationLink={linkRegistry.get('declaration', {
                                      organizationId: organizationId,
                                      eventSerieId: eventsSeriesWrapper.serie.id,
                                      declarationType: 'cnm',
                                    })}
                                  />
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Grid>
                      ) : (
                        <Grid item xs={12} sx={{ py: 2 }}>
                          {eventsSeriesWrappers.length === 0
                            ? `Aucun spectacle n'a été trouvé dans votre billetterie.`
                            : `Aucun spectacle n'a été trouvé dans votre billetterie avec le filtre choisi.`}
                        </Grid>
                      )}
                    </>
                  ) : (
                    <>
                      <Grid item xs={12} sx={{ pt: 2, pb: 1 }}>
                        <Alert severity="warning">
                          Veuillez synchroniser les données de votre billetterie pour débuter vos déclarations.{' '}
                          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 600 }}>
                            À noter que pour la première synchronisation cette opération peut durer quelques minutes en fonction de la quantité de
                            spectacles à retrouver.
                          </Typography>
                        </Alert>
                      </Grid>
                      {synchronizeDataFromTicketingSystems.error && (
                        <Grid item xs={12} sx={{ py: 1 }}>
                          <ErrorAlert errors={[synchronizeDataFromTicketingSystems.error]} />
                        </Grid>
                      )}
                    </>
                  )}
                </>
              </Grid>
            </Grid>
          </Grid>
        </>
      ) : (
        <Grid container sx={{ justifyContent: 'center', my: 'auto' }}>
          <Grid item xs={12}>
            <Typography component="p" variant="body2" sx={{ textAlign: 'center', py: 2 }}>
              La dernière étape pour commencer les déclarations est de connecter votre système de billetterie.
              <br />
              Des indications vous seront affichées en fonction du système choisi.
            </Typography>
          </Grid>
          <Grid item xs={12} sx={{ pt: 3, pb: 1, textAlign: 'center' }}>
            <Button
              component={NextLink}
              href={linkRegistry.get('ticketingSystemConnection', { organizationId: organizationId, onboarding: true })}
              size="large"
              variant="contained"
            >
              Connecter un système de billetterie
            </Button>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
