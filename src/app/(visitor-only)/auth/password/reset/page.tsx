import { Metadata } from 'next';

import { ResetPasswordPage } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Réinitialisation de mot de passe`),
};

export default function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <ResetPasswordPage />;
    </>
  );
}
