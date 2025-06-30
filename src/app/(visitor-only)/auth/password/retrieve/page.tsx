import { Metadata } from 'next';

import { ForgottenPasswordPage } from '@ad/src/app/(visitor-only)/auth/password/retrieve/ForgottenPasswordPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Demande de réinitialisation de mot de passe`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <ForgottenPasswordPage />;
    </>
  );
}
