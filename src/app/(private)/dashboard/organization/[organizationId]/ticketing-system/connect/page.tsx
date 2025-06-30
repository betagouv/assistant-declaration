import { Metadata } from 'next';

import {
  TicketingSystemConnectionPage,
  TicketingSystemConnectionPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/TicketingSystemConnectionPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Connexion d'un système de billetterie`),
};

export default async function Page({ params }: TicketingSystemConnectionPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <TicketingSystemConnectionPage params={await params} />
    </>
  );
}
