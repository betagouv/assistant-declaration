import { Metadata } from 'next';

import {
  CnmDeclarationPage,
  CnmDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/cnm/CnmDeclarationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration CNM d'un spectacle`),
};

export default async function Page({ params }: CnmDeclarationPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <CnmDeclarationPage params={await params} />
    </>
  );
}
