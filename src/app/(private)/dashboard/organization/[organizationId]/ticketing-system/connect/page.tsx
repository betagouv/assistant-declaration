'use client';

import {
  TicketingSystemConnectionPage,
  TicketingSystemConnectionPageProps,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/TicketingSystemConnectionPage';

export default function Page(props: TicketingSystemConnectionPageProps) {
  return <TicketingSystemConnectionPage {...props} />;
}
