import { Metadata } from 'next';

import {
  SacemDeclarationPage,
  SacemDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacem/SacemDeclarationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration SACEM d'un spectacle`),
};

export default async function Page({ params }: SacemDeclarationPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <SacemDeclarationPage params={await params} />
    </>
  );
}
