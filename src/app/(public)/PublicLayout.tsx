'use client';

import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { Header, HeaderProps } from '@codegouvfr/react-dsfr/Header';
import { ArrowForward } from '@mui/icons-material';
import { Button } from '@mui/material';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { PropsWithChildren, useMemo } from 'react';

import '@ad/src/app/(public)/layout.scss';
import { ContentWrapper } from '@ad/src/components/ContentWrapper';
import { FlashMessage } from '@ad/src/components/FlashMessage';
import { useSession } from '@ad/src/proxies/next-auth/react';
import { commonFooterAttributes, commonHeaderAttributes, helpQuickAccessItem, userQuickAccessItem } from '@ad/src/utils/dsfr';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function PublicLayout(props: PropsWithChildren) {
  const sessionWrapper = useSession();
  const pathname = usePathname();

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

  const stickyMenu = useMemo(() => pathname === linkRegistry.get('home', undefined), [pathname]);

  if (sessionWrapper.status === 'authenticated') {
    quickAccessItems.push(
      userQuickAccessItem(sessionWrapper.data?.user, {
        showDashboardMenuItem: true,
      })
    );
  } else {
    quickAccessItems.push({
      iconId: undefined as any,
      linkProps: {
        href: linkRegistry.get('signIn', undefined),
        style: {
          padding: 0,
        },
      },
      text: (
        <Button component="span" size="small" variant="contained" startIcon={<ArrowForward />}>
          Accès outil
        </Button>
      ),
    });
  }

  return (
    <>
      <Header
        {...commonHeaderAttributes}
        quickAccessItems={quickAccessItems}
        navigation={[]}
        style={stickyMenu ? { position: 'sticky', top: 0, zIndex: 1000 } : {}}
      />
      <FlashMessage appMode={process.env.NEXT_PUBLIC_APP_MODE} nodeEnv={process.env.NODE_ENV} />
      <ContentWrapper>{props.children}</ContentWrapper>
      <Footer {...commonFooterAttributes} />
    </>
  );
}
