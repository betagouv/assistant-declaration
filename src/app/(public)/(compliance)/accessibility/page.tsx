import { Metadata } from 'next';

import { AccessibilityPage } from '@ad/src/app/(public)/(compliance)/accessibility/AccessibilityPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration d'accessibilité`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <AccessibilityPage />;
    </>
  );
}
