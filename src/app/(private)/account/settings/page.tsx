'use client';

import { AccountSettingsPage } from '@ad/src/app/(private)/account/settings/AccountSettingsPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';

export default function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <AccountSettingsPage />;
    </>
  );
}
