import { Metadata } from 'next';

import { AccountSettingsPage } from '@ad/src/app/(private)/account/settings/AccountSettingsPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Paramètres du compte`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <AccountSettingsPage />;
    </>
  );
}
