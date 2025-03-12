import { Metadata } from 'next';

import {
  SacemDeclarationPage,
  SacemDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacem/SacemDeclarationPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration SACEM d'un spectacle`),
};

export default function Page(props: SacemDeclarationPageProps) {
  return <SacemDeclarationPage {...props} />;
}
