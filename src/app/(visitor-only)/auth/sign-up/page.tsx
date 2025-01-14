import { Metadata } from 'next';

import { SignUpPage } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Inscription`),
};

export default function Page() {
  return <SignUpPage />;
}
