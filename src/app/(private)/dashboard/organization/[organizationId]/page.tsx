'use client';

import { OrganizationPage, OrganizationPageProps } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/OrganizationPage';

export default function Page(props: OrganizationPageProps) {
  return <OrganizationPage {...props} />;
}
