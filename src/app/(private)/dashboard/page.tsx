import { Metadata } from 'next';

import { DashboardPage } from '@ad/src/app/(private)/dashboard/DashboardPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Tableau de bord`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <DashboardPage />;
    </>
  );
}
