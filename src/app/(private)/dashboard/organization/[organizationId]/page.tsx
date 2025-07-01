import { Metadata } from 'next';

import { OrganizationPage, OrganizationPageProps } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/OrganizationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Tableau de bord d'organisation`),
};

export default async function Page({ params }: OrganizationPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <OrganizationPage params={await params} />
    </>
  );
}
