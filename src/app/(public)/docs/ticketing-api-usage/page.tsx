import { Metadata } from 'next';

import Content from '@ad/src/app/(public)/docs/ticketing-api-usage/content.mdx';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Introduction pour les éditeurs de billetterie`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <Content />
    </>
  );
}
