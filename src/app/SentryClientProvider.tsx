'use client';

import * as Sentry from '@sentry/nextjs';
import { PropsWithChildren, useEffect } from 'react';

import { useSession } from '@ad/src/proxies/next-auth/react';

export function SentryClientProvider({ children }: PropsWithChildren) {
  const sessionWrapper = useSession();

  useEffect(() => {
    // Set Sentry user ID
    if (sessionWrapper.status === 'authenticated') {
      Sentry.setUser({ id: sessionWrapper.data.user.id });
    } else if (sessionWrapper.status === 'unauthenticated') {
      Sentry.setUser(null);
    }
  }, [sessionWrapper.status, sessionWrapper.data]);

  return <>{children}</>;
}
