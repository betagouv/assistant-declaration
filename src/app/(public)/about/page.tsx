import { Metadata } from 'next';

import { AboutPage } from '@ad/src/app/(public)/about/AboutPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`À propos`),
};

export default function Page() {
  return <AboutPage />;
}
