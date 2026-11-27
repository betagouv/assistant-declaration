'use client';

import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { PropsWithChildren } from 'react';

import { Header } from '@ad/src/components/Header';
import { useSession } from '@ad/src/proxies/next-auth/react';
import { commonFooterAttributes, commonHeaderAttributes, helpQuickAccessItem, userQuickAccessItem } from '@ad/src/utils/dsfr';

export default function MfaLayout({ children }: PropsWithChildren) {
  const sessionWrapper = useSession();

  return (
    <>
      <Header
        {...commonHeaderAttributes}
        quickAccessItems={[helpQuickAccessItem(), ...(sessionWrapper.data ? [userQuickAccessItem(sessionWrapper.data.user, null)] : [])]}
        navigation={[]}
        currentOrganization={null}
      />
      {children}
      <Footer {...commonFooterAttributes} />
    </>
  );
}
