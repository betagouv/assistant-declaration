import { Metadata } from 'next';

import { DashboardPage } from '@ad/src/app/(private)/dashboard/DashboardPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Tableau de bord`),
};

export default function Page() {
  return <DashboardPage />;
}
