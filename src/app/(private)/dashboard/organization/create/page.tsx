'use client';

import { OrganizationCreationPage } from '@ad/src/app/(private)/dashboard/organization/create/OrganizationCreationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

export default function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <OrganizationCreationPage />;
    </>
  );
}
