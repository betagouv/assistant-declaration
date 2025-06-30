import { Metadata } from 'next';

import { SignInPage } from '@ad/src/app/(visitor-only)/auth/sign-in/SignInPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Connexion`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <SignInPage />;
    </>
  );
}
