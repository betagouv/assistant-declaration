import { Metadata } from 'next';

import { ForgottenPasswordPage } from '@ad/src/app/(visitor-only)/auth/password/retrieve/ForgottenPasswordPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Demande de réinitialisation de mot de passe`),
};

export default function Page() {
  return <ForgottenPasswordPage />;
}
