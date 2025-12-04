'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { SegmentedControl, SegmentedControlProps } from '@codegouvfr/react-dsfr/SegmentedControl';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { RiAddCircleLine, RiLoopLeftFill } from '@remixicon/react';
import { push } from '@socialgouv/matomo-next';
import { isBefore, subHours, subMonths } from 'date-fns';
import NextLink from 'next/link';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsyncFn } from 'react-use';

import { OrganizationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/OrganizationPageContext';
import { trpc } from '@ad/src/client/trpcClient';
import { Button } from '@ad/src/components/Button';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventSerieCard } from '@ad/src/components/EventSerieCard';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { SynchronizeDataFromTicketingSystemsSchemaType } from '@ad/src/models/actions/event';
import { CustomError, internalServerErrorError } from '@ad/src/models/entities/errors';
import { TicketingSystemNameSchema } from '@ad/src/models/entities/ticketing';
import { mockBaseUrl, shouldTargetMock } from '@ad/src/server/mock/environment';
import { CHUNK_DATA_PREFIX, CHUNK_ERROR_PREFIX, CHUNK_PING_PREFIX } from '@ad/src/utils/api';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';
import { getBaseUrl } from '@ad/src/utils/url';

const textDecoder = new TextDecoder();

enum ListFilter {
  ALL = 'ALL',
  ARCHIVED_ONLY = 'ARCHIVED_ONLY',
  ENDED_ONLY = 'ENDED_ONLY',
  CURRENT_ONLY = 'CURRENT_ONLY',
  FUTURE_ONLY = 'FUTURE_ONLY',
}

export interface OrganizationPageProps {
  params: { organizationId: string };
}

export function OrganizationPage({ params: { organizationId } }: OrganizationPageProps) {
  const { t } = useTranslation('common');
  const { ContextualAddEventSerieForm } = useContext(OrganizationPageContext);

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
          return isBefore(eventSerieWrapper.computedEndAt, archivedThreshold);
        case ListFilter.ENDED_ONLY:
          return isBefore(eventSerieWrapper.computedEndAt, currentDate) && !isBefore(eventSerieWrapper.computedEndAt, archivedThreshold);
        case ListFilter.CURRENT_ONLY:
          return isBefore(eventSerieWrapper.computedStartAt, currentDate) && !isBefore(eventSerieWrapper.computedEndAt, currentDate);
        case ListFilter.FUTURE_ONLY:
          return !isBefore(eventSerieWrapper.computedStartAt, currentDate);
        default:
          return true;
      }
    });
  }, [listFilter, listEventsSeries.data]);

  const { remoteTicketingSystems, lastSynchronizationAt } = useMemo(() => {
    // The manual ticketing system must be separate to adjust properly the UI since it can be considered linked at account creation
    const tmpRemoteTicketingSystems = (listTicketingSystems.data?.ticketingSystems ?? []).filter(
      (ticketingSystem) => ticketingSystem.name !== 'MANUAL'
    );

    let oldestDate: Date | null = null;

    for (const remoteTicketingSystem of tmpRemoteTicketingSystems) {
      if (oldestDate === null || (remoteTicketingSystem.lastSynchronizationAt && remoteTicketingSystem.lastSynchronizationAt < oldestDate)) {
        oldestDate = remoteTicketingSystem.lastSynchronizationAt;
      }
    }

    return {
      remoteTicketingSystems: tmpRemoteTicketingSystems,
      lastSynchronizationAt: oldestDate,
    };
  }, [listTicketingSystems.data]);

  const lastSynchronizationTooOld: boolean = useMemo(() => {
    const thresholdDate = subHours(new Date(), 24);

    return lastSynchronizationAt ? isBefore(lastSynchronizationAt, thresholdDate) : true;
  }, [lastSynchronizationAt]);

  const [eventSerieCreationModalOpen, setEventSerieCreationModalOpen] = useState<boolean>(false);
  const openEventSerieCreationModal = useCallback(() => {
    setEventSerieCreationModalOpen(true);
  }, [setEventSerieCreationModalOpen]);
  const closeEventSerieCreationModal = useCallback(() => {
    setEventSerieCreationModalOpen(false);
  }, [setEventSerieCreationModalOpen]);

  if (aggregatedQueries.isPending) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (aggregatedQueries.hasError) {
    return (
      <div className={fr.cx('fr-container', 'fr-py-12v')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-md-8', 'fr-col-lg-6')}>
            <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
          </div>
        </div>
      </div>
    );
  }

  const organization = getOrganization.data!.organization;
  const eventsSeriesWrappers = listEventsSeries.data!.eventsSeriesWrappers;

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')} style={{ height: '100%' }}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')} style={{ height: '100%' }}>
        <div
          className={fr.cx('fr-col-12')}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'start',
            alignItems: 'center',
            margin: '0 auto',
          }}
        >
          <h1 className={fr.cx('fr-h4')}>Déclarer un spectacle</h1>
          {remoteTicketingSystems.length > 0 ? (
            <>
              <p
                className={fr.cx('fr-text--lg')}
                style={{
                  textAlign: 'center',
                  maxWidth: 600,
                  margin: '0 auto',
                }}
              >
                Synchronisez vos données, puis sélectionnez le spectacle à déclarer. Il manque un spectacle ? Ajoutez-le manuellement.
              </p>
              {lastSynchronizationAt !== null ? (
                <>
                  {lastSynchronizationTooOld ? (
                    <Alert
                      severity="warning"
                      small={true}
                      description={`La dernière synchronisation date d'${t('date.ago', {
                        date: lastSynchronizationAt,
                      })}. Il est fortement recommandé de resynchroniser vos données avant de faire une déclaration.`}
                      className={fr.cx('fr-mt-4v')}
                    />
                  ) : (
                    <Alert
                      severity="info"
                      small={true}
                      description={`Vous avez synchronisé vos données de billetterie ${t('date.relative', { date: lastSynchronizationAt })}.`}
                      className={fr.cx('fr-mt-4v')}
                    />
                  )}
                  {synchronizeDataFromTicketingSystems.error && (
                    <div className={fr.cx('fr-mt-4v')}>
                      <ErrorAlert errors={[synchronizeDataFromTicketingSystems.error]} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Alert
                    severity="warning"
                    small={true}
                    description={
                      <>
                        Veuillez synchroniser les données de votre billetterie pour débuter vos déclarations.{' '}
                        <span className={fr.cx('fr-text--bold')}>
                          À noter que pour la première synchronisation cette opération peut durer quelques minutes en fonction de la quantité de
                          spectacles à retrouver.
                        </span>
                      </>
                    }
                    className={fr.cx('fr-mt-4v')}
                  />
                </>
              )}
              <div className={fr.cx('fr-my-6v')} style={{ display: 'flex', gap: '1rem' }}>
                <Button
                  onClick={async () => {
                    await synchronizeDataFromTicketingSystemsTrigger({
                      organizationId: organization.id,
                    });

                    push(['trackEvent', 'ticketing', 'synchronize']);
                  }}
                  loading={synchronizeDataFromTicketingSystems.loading}
                >
                  <RiLoopLeftFill size={20} aria-hidden={true} style={{ marginRight: 8 }} />
                  Synchroniser
                </Button>
                <Button onClick={openEventSerieCreationModal} priority="secondary">
                  <RiAddCircleLine size={20} aria-hidden={true} style={{ marginRight: 8 }} />
                  Ajouter un spectacle
                </Button>
              </div>
            </>
          ) : (
            <>
              <p
                className={fr.cx('fr-text--lg')}
                style={{
                  maxWidth: 700,
                  margin: '0 auto',
                  textAlign: 'center',
                }}
              >
                <NextLink
                  href={linkRegistry.get('ticketingSystemConnection', { organizationId: organizationId, onboarding: true })}
                  className={fr.cx('fr-link', 'fr-text--lg')}
                >
                  Branchez votre logiciel de billetterie
                </NextLink>{' '}
                pour visualiser vos spectacles et déclarer plus rapidement, ou ajouter manuellement un spectacle.
              </p>
              <Button onClick={openEventSerieCreationModal} className={fr.cx('fr-my-6v')}>
                <RiAddCircleLine size={20} aria-hidden={true} style={{ marginRight: 8 }} />
                Ajouter un spectacle
              </Button>
            </>
          )}
          {listEventsSeries.data && listEventsSeries.data.eventsSeriesWrappers.length > 0 && (
            <>
              <div className={fr.cx('fr-py-2v')} aria-label="filtre">
                <SegmentedControl
                  segments={
                    [
                      {
                        label: 'Tous',
                        value: ListFilter.ALL,
                      },
                      {
                        label: 'Archivés',
                        value: ListFilter.ARCHIVED_ONLY,
                      },
                      {
                        label: 'Terminés',
                        value: ListFilter.ENDED_ONLY,
                      },
                      {
                        label: 'En cours',
                        value: ListFilter.CURRENT_ONLY,
                      },
                      {
                        label: 'À venir',
                        value: ListFilter.FUTURE_ONLY,
                      },
                    ].map((segment) => {
                      return {
                        label: segment.label,
                        nativeInputProps: {
                          value: segment.value as unknown as string,
                          defaultChecked: segment.value === listFilter,
                          onChange: (event) => {
                            setListFilter(event.currentTarget.value as ListFilter);
                          },
                        },
                      } satisfies SegmentedControlProps.Segments[0];
                    }) as SegmentedControlProps.Segments // Cast needed because the type expects a tuple, not an array
                  }
                  hideLegend={true}
                ></SegmentedControl>
              </div>
              {filteredEventsSeriesWrappers.length > 0 && (
                <div className={fr.cx('fr-pt-4v')} style={{ width: '100%', maxWidth: 850 }}>
                  {filteredEventsSeriesWrappers.map((eventsSeriesWrapper) => {
                    return (
                      <div key={eventsSeriesWrapper.serie.id} className={fr.cx('fr-py-2v')}>
                        <EventSerieCard
                          wrapper={eventsSeriesWrapper}
                          declarationLink={linkRegistry.get('declaration', {
                            organizationId: organizationId,
                            eventSerieId: eventsSeriesWrapper.serie.id,
                          })}
                          onUpdate={eventsSeriesWrapper.ticketingSystemName === TicketingSystemNameSchema.enum.MANUAL ? async () => {} : undefined}
                          onRemove={eventsSeriesWrapper.ticketingSystemName === TicketingSystemNameSchema.enum.MANUAL ? async () => {} : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              {eventsSeriesWrappers.length > 0 && filteredEventsSeriesWrappers.length === 0 && (
                <p className={fr.cx('fr-py-4v')}>Aucun spectacle n&apos;a été trouvé avec le filtre choisi.</p>
              )}
            </>
          )}
        </div>
      </div>
      <Dialog open={eventSerieCreationModalOpen} onClose={closeEventSerieCreationModal}>
        <DialogTitle>Ajout manuel d&apos;un spectacle</DialogTitle>
        <DialogContent>
          <ContextualAddEventSerieForm
            prefill={{ ticketingSystemId: null, organizationId: organizationId }}
            onSuccess={closeEventSerieCreationModal}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
