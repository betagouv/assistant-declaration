import { createContext } from 'react';

import { UpdateTicketingSystemForm } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-systems/UpdateTicketingSystemForm';

export const TicketingSystemCardContext = createContext({
  ContextualUpdateTicketingSystemForm: UpdateTicketingSystemForm,
});
