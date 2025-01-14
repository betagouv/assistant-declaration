import { Metadata } from 'next';

import { OrganizationPage, OrganizationPageProps } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/OrganizationPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Tableau de bord d'organisation`),
};

export default function Page(props: OrganizationPageProps) {
  return <OrganizationPage {...props} />;
}
