import { headers } from 'next/headers';

import { ErrorLayout } from '@ad/src/app/ErrorLayout';
import { ServerLayout } from '@ad/src/app/ServerLayout';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

export async function NotFound({ error, reset }: { error: Error; reset: () => void }) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') || undefined;

  return (
    <ServerLayout nonce={nonce}>
      <StartDsfrOnHydration />
      <ErrorLayout code={404} />
    </ServerLayout>
  );
}

export default NotFound;
