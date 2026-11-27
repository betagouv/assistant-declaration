import { Metadata } from 'next';

import { MfaPage } from '@ad/src/app/mfa/MfaPage';
import { ContentWrapper } from '@ad/src/components/ContentWrapper';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Vérification en deux étapes`),
};

export default async function Page() {
  return (
    <>
      <StartDsfrOnHydration />
      <ContentWrapper>
        <MfaPage />
      </ContentWrapper>
    </>
  );
}
