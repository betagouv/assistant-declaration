'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { ErrorLayout } from '@ad/src/app/ErrorLayout';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

export function Error({ error, reset }: { error: Error; reset: () => void }) {
  // Report to Sentry as unexpected
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // By default for all errors we set the public layout, but we use another specific handler for private section
  return (
    <>
      <StartDsfrOnHydration />
      <ErrorLayout code={500} />
    </>
  );
}

export default Error;
