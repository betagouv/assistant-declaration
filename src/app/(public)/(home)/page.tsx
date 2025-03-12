import { Metadata } from 'next';

import { HomePage } from '@ad/src/app/(public)/(home)/HomePage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`À propos`),
};

export default function Page() {
  return <HomePage />;
}
