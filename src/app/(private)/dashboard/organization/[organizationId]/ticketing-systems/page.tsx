import { Metadata } from 'next';

import {
  TicketingSystemListPage,
  TicketingSystemListPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-systems/TicketingSystemListPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Liste des systèmes de billetterie connectés`),
};

export default async function Page({ params }: TicketingSystemListPageProps) {
  return (
    <>
      <StartDsfrOnHydration />
      <TicketingSystemListPage params={await params} />
    </>
  );
}
