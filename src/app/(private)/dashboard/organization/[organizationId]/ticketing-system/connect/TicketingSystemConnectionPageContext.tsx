import { createContext } from 'react';

import { ConnectTicketingSystemForm } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/ConnectTicketingSystemForm';

export const TicketingSystemConnectionPageContext = createContext({
  ContextualConnectTicketingSystemForm: ConnectTicketingSystemForm,
});
