import { Metadata } from 'next';

import { AboutPage } from '@ad/src/app/(public)/about/AboutPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`À propos`),
};

export default function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <AboutPage />;
    </>
  );
}
