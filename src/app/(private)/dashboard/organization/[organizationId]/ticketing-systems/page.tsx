'use client';

import {
  TicketingSystemListPage,
  TicketingSystemListPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-systems/TicketingSystemListPage';

export default function Page(props: TicketingSystemListPageProps) {
  return <TicketingSystemListPage {...props} />;
}
