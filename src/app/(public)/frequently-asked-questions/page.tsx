import { Metadata } from 'next';

import { FrequentlyAskedQuestionsPage } from '@ad/src/app/(public)/frequently-asked-questions/FrequentlyAskedQuestionsPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Questions-réponses`),
};

export default function Page() {
  return <FrequentlyAskedQuestionsPage />;
}
