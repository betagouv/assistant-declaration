import { Metadata } from 'next';

import Content from '@ad/src/app/(public)/docs/soticket-connection/content.mdx';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Comment connecter SoTicket ?`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <Content />
    </>
  );
}
