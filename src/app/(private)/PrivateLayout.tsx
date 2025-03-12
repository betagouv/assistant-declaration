'use client';

import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { Header } from '@codegouvfr/react-dsfr/Header';
import { HeaderProps } from '@codegouvfr/react-dsfr/Header';
import { MainNavigationProps } from '@codegouvfr/react-dsfr/MainNavigation';
import { MenuProps } from '@codegouvfr/react-dsfr/MainNavigation/Menu';
import Badge from '@mui/material/Badge';
import Grid from '@mui/material/Grid';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';

import { trpc } from '@ad/src/client/trpcClient';
import { ContentWrapper } from '@ad/src/components/ContentWrapper';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { FlashMessage } from '@ad/src/components/FlashMessage';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';
import { UserInterfaceSessionProvider } from '@ad/src/components/user-interface-session/UserInterfaceSessionProvider';
import { signIn, useSession } from '@ad/src/proxies/next-auth/react';
import { commonFooterAttributes, commonHeaderAttributes, organizationSwichQuickAccessItem, userQuickAccessItem } from '@ad/src/utils/dsfr';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { hasPathnameThisMatch } from '@ad/src/utils/url';

export function PrivateLayout(props: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionWrapper = useSession();
  const [logoutCommitted, setLogoutCommitted] = useState(false);

  const { data, error, isLoading, refetch } = trpc.getInterfaceSession.useQuery({});

  useEffect(() => {
    if (sessionWrapper.status === 'unauthenticated' && !logoutCommitted) {
      signIn();
    }
  }, [logoutCommitted, router, sessionWrapper.status]);

  const { showLiveChat } = useLiveChat();

  if (isLoading || sessionWrapper.status !== 'authenticated') {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (error) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={[error]} refetchs={[refetch]} />
      </Grid>
    );
  }

  const userInterfaceSession = data?.session;

  const currentOrganization = userInterfaceSession.collaboratorOf.find((organization) => {
    const organizationPageBaseUrl = linkRegistry.get('organization', {
      organizationId: organization.id,
    });

    if (pathname?.startsWith(organizationPageBaseUrl)) {
      return true;
    }

    return false;
  });

  const quickAccessItems: HeaderProps.QuickAccessItem[] = [
    {
      iconId: 'fr-icon-questionnaire-line',
      buttonProps: {
        onClick: (event) => {
          showLiveChat();
        },
      },
      text: 'Aide',
    },
    userQuickAccessItem(sessionWrapper.data?.user),
  ];

  if (userInterfaceSession.collaboratorOf.length) {
    quickAccessItems.unshift(
      organizationSwichQuickAccessItem({
        organizations: userInterfaceSession.collaboratorOf,
        currentOrganization: currentOrganization,
      })
    );
  }

  const dashboardLink = linkRegistry.get('dashboard', undefined);

  const navigation: MainNavigationProps.Item[] = [];

  if (currentOrganization) {
    const organizationLink = linkRegistry.get('organization', {
      organizationId: currentOrganization.id,
    });
    const ticketingSystemsLink = linkRegistry.get('ticketingSystemList', {
      organizationId: currentOrganization.id,
    });

    navigation.push({
      isActive: hasPathnameThisMatch(pathname, organizationLink),
      text: 'Spectacles',
      linkProps: {
        href: organizationLink,
        target: '_self',
      },
    });

    navigation.push({
      isActive: hasPathnameThisMatch(pathname, ticketingSystemsLink),
      text: 'Billetteries',
      linkProps: {
        href: ticketingSystemsLink,
        target: '_self',
      },
    });
  } else {
    navigation.push({
      isActive: hasPathnameThisMatch(pathname, dashboardLink),
      text: 'Tableau de bord',
      linkProps: {
        href: dashboardLink,
        target: '_self',
      },
    });
  }

  return (
    <>
      <UserInterfaceSessionProvider session={userInterfaceSession}>
        <Header {...commonHeaderAttributes} quickAccessItems={quickAccessItems} navigation={navigation} />
        <FlashMessage appMode={process.env.NEXT_PUBLIC_APP_MODE} nodeEnv={process.env.NODE_ENV} />
        <ContentWrapper>{props.children}</ContentWrapper>
        <Footer {...commonFooterAttributes} />
      </UserInterfaceSessionProvider>
    </>
  );
}
