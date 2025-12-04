import { createContext } from 'react';

import { UpdateEventSerieForm } from '@ad/src/app/(private)/dashboard/organization/UpdateEventSerieForm';

export const EventSerieCardContext = createContext({
  ContextualUpdateEventSerieForm: UpdateEventSerieForm,
});
