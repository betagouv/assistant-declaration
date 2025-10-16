'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { useCallback } from 'react';

import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { TicketingSystemCard } from '@ad/src/components/TicketingSystemCard';
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
      <div className={fr.cx('fr-container', 'fr-py-12v')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-md-8', 'fr-col-lg-6')}>
            <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
          </div>
        </div>
      </div>
    );
  } else if (aggregatedQueries.isPending) {
    return <LoadingArea ariaLabelTarget="page" />;
  }

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-pb-6v')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-7')} style={{ display: 'flex', alignItems: 'center' }}>
          <h1 className={fr.cx('fr-h5', 'fr-m-0')}>Mes billetteries connectées</h1>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-5')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
          <NextLink href={linkRegistry.get('ticketingSystemConnection', { organizationId: organizationId })} className={fr.cx('fr-btn')}>
            <span className={fr.cx('fr-icon-add-circle-line')} style={{ marginRight: 5 }} aria-hidden="true"></span>
            Connecter une billetterie
          </NextLink>
        </div>
      </div>
      {ticketingSystems.length ? (
        <ul className={cx('ulReset', fr.cx('fr-grid-row', 'fr-grid-row--gutters'))}>
          {ticketingSystems.map((ticketingSystem) => (
            <li key={ticketingSystem.id} className={fr.cx('fr-col-12', 'fr-col-sm-6')}>
              <TicketingSystemCard ticketingSystem={ticketingSystem} disconnectAction={() => disconnectTicketingSystemAction(ticketingSystem.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
          <div className={fr.cx('fr-col-12')}>
            <p>Aucune billetterie n&apos;est pour l&apos;instant connectée</p>
          </div>
        </div>
      )}
    </div>
  );
}
