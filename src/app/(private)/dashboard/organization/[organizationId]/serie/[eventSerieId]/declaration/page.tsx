import { Metadata } from 'next';

import {
  DeclarationPage,
  DeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration d'un spectacle`),
};

export default async function Page({ params }: DeclarationPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <DeclarationPage params={await params} />
    </>
  );
}
