import { Metadata } from 'next';

import { PrivacyPolicyPage } from '@ad/src/app/(public)/(compliance)/privacy-policy/PrivacyPolicyPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Politique de confidentialité`),
};

export default function Page() {
  return <PrivacyPolicyPage />;
}
