'use client';

import { TermsOfUsePage } from '@ad/src/app/(public)/(compliance)/terms-of-use/TermsOfUsePage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

export default function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <TermsOfUsePage />;
    </>
  );
}
