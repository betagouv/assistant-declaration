import { Metadata } from 'next';

import { Content } from '@ad/src/app/(public)/docs/ticketing-api-definition/Content.tsx';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Spécifications de l'API éditeur`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <Content />
    </>
  );
}
