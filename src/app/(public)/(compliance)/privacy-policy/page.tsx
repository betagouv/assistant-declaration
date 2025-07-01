import { Metadata } from 'next';

import { PrivacyPolicyPage } from '@ad/src/app/(public)/(compliance)/privacy-policy/PrivacyPolicyPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Politique de confidentialité`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <PrivacyPolicyPage />;
    </>
  );
}
