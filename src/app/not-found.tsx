'use client';

import { PublicLayout } from '@ad/src/app/(public)/PublicLayout';
import { ErrorPage, error404Props } from '@ad/src/components/ErrorPage';

export function Error404({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PublicLayout>
        <ErrorPage {...error404Props} />
      </PublicLayout>
    </>
  );
}

export default Error404;
