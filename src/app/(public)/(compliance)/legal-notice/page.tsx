import { Metadata } from 'next';

import { LegalNoticePage } from '@ad/src/app/(public)/(compliance)/legal-notice/LegalNoticePage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Mentions légales`),
};

export default function Page() {
  return <LegalNoticePage />;
}
