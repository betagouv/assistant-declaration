import { Metadata } from 'next';

import {
  SacdDeclarationPage,
  SacdDeclarationPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacd/SacdDeclarationPage';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Déclaration SACD d'une série de représentation`),
};

export default function Page(props: SacdDeclarationPageProps) {
  return <SacdDeclarationPage {...props} />;
}
