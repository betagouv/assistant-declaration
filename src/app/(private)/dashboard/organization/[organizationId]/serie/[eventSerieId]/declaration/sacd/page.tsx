import { Metadata } from 'next';

import {
  SacdDeclarationPage,
  SacdDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacd/SacdDeclarationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration SACD d'un spectacle`),
};

export default async function Page({ params }: SacdDeclarationPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <SacdDeclarationPage params={await params} />
    </>
  );
}
