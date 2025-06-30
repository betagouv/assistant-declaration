import { Metadata } from 'next';

import {
  AstpDeclarationPage,
  AstpDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/astp/AstpDeclarationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration ASTP d'un spectacle`),
};

export default async function Page({ params }: AstpDeclarationPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <AstpDeclarationPage params={await params} />
    </>
  );
}
