import { Metadata } from 'next';

import { SignUpPage } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Inscription`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <SignUpPage />;
    </>
  );
}
