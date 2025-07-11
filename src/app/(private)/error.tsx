'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorPage, error500Props } from '@ad/src/components/ErrorPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

//
// This is an override of the main `error.tsx` to only use the private layout
// so the user can easily use the menu to go to another page potentially working fine
//

export function Error({ error, reset }: { error: Error; reset: () => void }) {
  // Report to Sentry as unexpected
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <>
      <StartDsfrOnHydration />
      <ErrorPage {...error500Props} />
    </>
  );
}

export default Error;
