import { Metadata } from 'next';

import { OrganizationCreationPage } from '@ad/src/app/(private)/dashboard/organization/create/OrganizationCreationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Création d'une organisation`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <OrganizationCreationPage />;
    </>
  );
}
