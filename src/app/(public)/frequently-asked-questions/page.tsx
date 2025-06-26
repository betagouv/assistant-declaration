import { Metadata } from 'next';

import { FrequentlyAskedQuestionsPage } from '@ad/src/app/(public)/frequently-asked-questions/FrequentlyAskedQuestionsPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Questions-réponses`),
};

export default function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <FrequentlyAskedQuestionsPage />;
    </>
  );
}
