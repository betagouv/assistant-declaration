'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// import { PublicLayout } from '@ad/src/app/(public)/PublicLayout';
// import { ErrorPage, error500Props } from '@ad/src/components/ErrorPage';

export function Error500({ error, reset }: { error: Error; reset: () => void }) {
  // Report to Sentry as unexpected
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <>
      <div>THIS IS AN ERROR 500</div>
      {/* <PublicLayout>
        <ErrorPage {...error500Props} />
      </PublicLayout> */}
    </>
  );
}

export default Error500;
