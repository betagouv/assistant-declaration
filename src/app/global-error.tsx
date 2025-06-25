'use client';

import * as Sentry from '@sentry/nextjs';

import { PublicLayout } from '@ad/src/app/(public)/PublicLayout';
import { ErrorPage, error500Props } from '@ad/src/components/ErrorPage';

export function Error500({ error, reset }: { error: Error; reset: () => void }) {
  // Report to Sentry as unexpected
  Sentry.captureException(error);

  return (
    <>
      <PublicLayout>
        <ErrorPage {...error500Props} />
      </PublicLayout>
    </>
  );
}

export default Error500;
