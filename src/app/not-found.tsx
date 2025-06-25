import { ErrorLayout } from '@ad/src/app/error-layout';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

export function Error404({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <StartDsfrOnHydration />
      <ErrorLayout code={404} />
    </>
  );
}

export default Error404;
