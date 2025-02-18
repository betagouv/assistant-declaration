import { Metadata } from 'next';

import {
  CnmDeclarationPage,
  CnmDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/cnm/CnmDeclarationPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration CNM d'une série de représentation`),
};

export default function Page(props: CnmDeclarationPageProps) {
  return <CnmDeclarationPage {...props} />;
}
