'use client';

import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { HeaderProps } from '@codegouvfr/react-dsfr/Header';
import { usePathname } from 'next/navigation';
import { PropsWithChildren, useMemo } from 'react';

import styles from '@ad/src/app/(public)/PublicLayout.module.scss';
import '@ad/src/app/(public)/layout.scss';
import { ContentWrapper } from '@ad/src/components/ContentWrapper';
import { FlashMessage } from '@ad/src/components/FlashMessage';
import { Header } from '@ad/src/components/Header';
import { useSession } from '@ad/src/proxies/next-auth/react';
import { commonFooterAttributes, commonHeaderAttributes, helpQuickAccessItem } from '@ad/src/utils/dsfr';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function PublicLayout(props: PropsWithChildren) {
  const sessionWrapper = useSession();
  const pathname = usePathname();

  // Not considerding the logged in state because of our chosen design on public pages
  let quickAccessItems: HeaderProps.QuickAccessItem[] = [
    {
      iconId: 'fr-icon-file-text-line',
      linkProps: {
        href: linkRegistry.get('about', undefined),
      },
      text: 'À propos',
    },
    helpQuickAccessItem(),
  ];

  const stickyMenu = useMemo(() => pathname === linkRegistry.get('about', undefined), [pathname]);

  quickAccessItems.push({
    iconId: 'fr-icon-arrow-right-line',
    linkProps: {
      className: styles.primaryLink,
      href: sessionWrapper.status === 'authenticated' ? linkRegistry.get('dashboard', undefined) : linkRegistry.get('signIn', undefined),
    },
    text: 'Accès outil',
  });

  return (
    <>
      <Header
        {...commonHeaderAttributes}
        quickAccessItems={quickAccessItems}
        navigation={[]}
        currentOrganization={null}
        style={stickyMenu ? { position: 'sticky', top: 0, zIndex: 1000 } : {}}
      />
      <FlashMessage appMode={process.env.NEXT_PUBLIC_APP_MODE} nodeEnv={process.env.NODE_ENV} />
      <ContentWrapper>{props.children}</ContentWrapper>
      <Footer {...commonFooterAttributes} />
    </>
  );
}
