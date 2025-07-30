import { Metadata } from 'next';

import Content from '@ad/src/app/(public)/docs/billetweb-connection/content.mdx';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Comment connecter Billetweb ?`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <Content />
    </>
  );
}
