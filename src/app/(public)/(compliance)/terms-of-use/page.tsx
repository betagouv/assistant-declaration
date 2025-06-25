import { Metadata } from 'next';

import { TermsOfUsePage } from '@ad/src/app/(public)/(compliance)/terms-of-use/TermsOfUsePage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Modalités d'utilisation`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <TermsOfUsePage />;
    </>
  );
}
