'use client';

import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { Header, HeaderProps } from '@codegouvfr/react-dsfr/Header';
import { PropsWithChildren } from 'react';

import '@ad/src/app/(public)/layout.scss';
import { ContentWrapper } from '@ad/src/components/ContentWrapper';
import { FlashMessage } from '@ad/src/components/FlashMessage';
import { useSession } from '@ad/src/proxies/next-auth/react';
import { commonFooterAttributes, commonHeaderAttributes, helpQuickAccessItem, userQuickAccessItem } from '@ad/src/utils/dsfr';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function PublicLayout(props: PropsWithChildren) {
  const sessionWrapper = useSession();

  let quickAccessItems: HeaderProps.QuickAccessItem[] = [
    {
      iconId: 'fr-icon-home-4-line',
      linkProps: {
        href: linkRegistry.get('home', undefined),
      },
      text: 'À propos',
    },
    helpQuickAccessItem(),
  ];

  if (sessionWrapper.status === 'authenticated') {
    quickAccessItems.push(
      userQuickAccessItem(sessionWrapper.data?.user, {
        showDashboardMenuItem: true,
      })
    );
  } else {
    quickAccessItems.push({
      iconId: 'fr-icon-lock-line',
      linkProps: {
        href: linkRegistry.get('signIn', undefined),
      },
      text: 'Se connecter',
    });
  }

  return (
    <>
      <Header {...commonHeaderAttributes} quickAccessItems={quickAccessItems} navigation={[]} />
      <FlashMessage appMode={process.env.NEXT_PUBLIC_APP_MODE} nodeEnv={process.env.NODE_ENV} />
      <ContentWrapper>{props.children}</ContentWrapper>
      <Footer {...commonFooterAttributes} />
    </>
  );
}
