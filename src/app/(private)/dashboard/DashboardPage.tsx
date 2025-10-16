'use client';

import { fr } from '@codegouvfr/react-dsfr';
import NextLink from 'next/link';
import { redirect } from 'next/navigation';

import { trpc } from '@ad/src/client/trpcClient';
import { Button } from '@ad/src/components/Button';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface DashboardPageProps {}

export function DashboardPage(props: DashboardPageProps) {
  const { showLiveChat, isLiveChatLoading } = useLiveChat();

  const { data, error, isPending, refetch } = trpc.getInterfaceSession.useQuery({});

  if (isPending) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (error) {
    return (
      <div className={fr.cx('fr-container', 'fr-py-12v')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-md-8', 'fr-col-lg-6')}>
            <ErrorAlert errors={[error]} refetchs={[refetch]} />
          </div>
        </div>
      </div>
    );
  }

  const userInterfaceSession = data.session;

  // Since we have a manual onboarding for now we can consider all users having at last 1 organization
  if (userInterfaceSession.collaboratorOf.length) {
    const organization = userInterfaceSession.collaboratorOf[0];

    redirect(
      linkRegistry.get('organization', {
        organizationId: organization.id,
      })
    );

    return;
  } else {
    // Simple user cannot see much
    return (
      <div className={fr.cx('fr-container', 'fr-py-12v')} style={{ height: '100%' }}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')} style={{ height: '100%' }}>
          <div
            className={fr.cx('fr-col-12')}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
          >
            <h1 className={fr.cx('fr-h4')}>Bienvenue sur la plateforme !</h1>
            <p>Pour commencer à synchroniser votre billetterie pour les déclarations, votre compte doit être rattaché à une organisation.</p>
            <NextLink href={linkRegistry.get('organizationCreation', undefined)} className={fr.cx('fr-btn', 'fr-mt-8v')}>
              Créer une organisation sur la plateforme
            </NextLink>
            <Button
              onClick={showLiveChat}
              loading={isLiveChatLoading}
              priority="secondary"
              nativeButtonProps={{
                className: fr.cx('fr-mt-4v'),
              }}
            >
              Demander à être rattaché(e) à une organisation créée par un collègue
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
