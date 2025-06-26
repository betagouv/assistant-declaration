import { Metadata } from 'next';

import {
  AstpDeclarationPage,
  AstpDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/astp/AstpDeclarationPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration ASTP d'un spectacle`),
};

export default function Page(props: AstpDeclarationPageProps) {
  return <AstpDeclarationPage {...props} />;
}
