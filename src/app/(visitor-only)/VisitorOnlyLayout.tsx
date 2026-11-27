'use client';

import { useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

import { PublicLayout } from '@ad/src/app/(public)/PublicLayout';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { useSession } from '@ad/src/proxies/next-auth/react';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function VisitorOnlyLayout(props: PropsWithChildren) {
  const sessionWrapper = useSession();
  const router = useRouter();

  useEffect(() => {
    if (sessionWrapper.status === 'authenticated') {
      const { mfaEnabled, mfaVerified } = sessionWrapper.data?.user || {};

      // If MFA is enabled and verified, go to dashboard
      if (mfaEnabled && mfaVerified) {
        router.push(linkRegistry.get('dashboard', undefined));
      } else {
        // Otherwise, redirect to MFA page (setup or verification)
        router.push('/mfa');
      }
    }
  }, [router, sessionWrapper.status, sessionWrapper.data]);

  if (sessionWrapper.status !== 'unauthenticated') {
    return <LoadingArea ariaLabelTarget="contenu" />;
  }

  // Take as layout the public one
  return (
    <>
      <PublicLayout>{props.children}</PublicLayout>
    </>
  );
}
