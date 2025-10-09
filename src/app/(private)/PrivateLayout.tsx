'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { HeaderProps } from '@codegouvfr/react-dsfr/Header';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { trpc } from '@ad/src/client/trpcClient';
import { ContentWrapper } from '@ad/src/components/ContentWrapper';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { FlashMessage } from '@ad/src/components/FlashMessage';
import { Header } from '@ad/src/components/Header';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { UserInterfaceSessionProvider } from '@ad/src/components/user-interface-session/UserInterfaceSessionProvider';
import { UserInterfaceOrganizationSchemaType } from '@ad/src/models/entities/ui';
import { signIn, useSession } from '@ad/src/proxies/next-auth/react';
import { commonFooterAttributes, commonHeaderAttributes, helpQuickAccessItem, userQuickAccessItem } from '@ad/src/utils/dsfr';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function PrivateLayout(props: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionWrapper = useSession();
  const [logoutCommitted, setLogoutCommitted] = useState(false);

  const { data, error, isPending, refetch } = trpc.getInterfaceSession.useQuery({});

  useEffect(() => {
    if (sessionWrapper.status === 'unauthenticated' && !logoutCommitted) {
      signIn();
    }
  }, [logoutCommitted, router, sessionWrapper.status]);

  const { userInterfaceSession, currentOrganization } = useMemo(() => {
    const session = data?.session;

    let currentOrganization: UserInterfaceOrganizationSchemaType | undefined = undefined;
    if (session) {
      currentOrganization = session.collaboratorOf.find((organization) => {
        const organizationPageBaseUrl = linkRegistry.get('organization', {
          organizationId: organization.id,
        });

        if (pathname?.startsWith(organizationPageBaseUrl)) {
          return true;
        }

        return false;
      });

      // [WORKAROUND] Since the design ignores the multi-organizations possibility for a user
      // by default we always set one even if not on an organization page
      if (!currentOrganization && session.collaboratorOf.length > 0) {
        currentOrganization = session.collaboratorOf[0];
      }
    }

    return {
      userInterfaceSession: session,
      currentOrganization: currentOrganization,
    };
  }, [data, pathname]);

  const quickAccessItems: HeaderProps.QuickAccessItem[] = useMemo(() => {
    if (!sessionWrapper.data) {
      return [];
    }

    return [
      {
        iconId: 'fr-icon-file-text-line',
        linkProps: {
          href: linkRegistry.get('about', undefined),
        },
        text: 'À propos',
      },
      helpQuickAccessItem(),
      userQuickAccessItem(sessionWrapper.data.user, currentOrganization || null),
    ];
  }, [sessionWrapper.data, currentOrganization]);

  if (isPending || sessionWrapper.status !== 'authenticated') {
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

  return (
    <>
      <UserInterfaceSessionProvider session={userInterfaceSession!}>
        <Header {...commonHeaderAttributes} quickAccessItems={quickAccessItems} currentOrganization={currentOrganization || null} />
        <FlashMessage appMode={process.env.NEXT_PUBLIC_APP_MODE} nodeEnv={process.env.NODE_ENV} />
        <ContentWrapper>{props.children}</ContentWrapper>
        <Footer {...commonFooterAttributes} />
      </UserInterfaceSessionProvider>
    </>
  );
}
