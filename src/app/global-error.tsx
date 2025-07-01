'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorLayout } from '@ad/src/app/error-layout';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

export function Error500({ error, reset }: { error: Error; reset: () => void }) {
  // Report to Sentry as unexpected
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <>
      {/* TODO: `global-error.tsx` cannot be a RSC so it seems react-dsfr is not properly initialized */}
      {/* <StartDsfrOnHydration /> */}
      <ErrorLayout code={500} />
    </>
  );
}

export default Error500;
