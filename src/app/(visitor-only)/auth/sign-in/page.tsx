import { Metadata } from 'next';

import { SignInPage } from '@ad/src/app/(visitor-only)/auth/sign-in/SignInPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Connexion`),
};

export default function Page() {
  return <SignInPage />;
}
