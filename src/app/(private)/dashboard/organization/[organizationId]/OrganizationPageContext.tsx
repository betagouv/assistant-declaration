import { createContext } from 'react';

import { AddEventSerieForm } from '@ad/src/app/(private)/dashboard/organization/AddEventSerieForm';

export const OrganizationPageContext = createContext({
  ContextualAddEventSerieForm: AddEventSerieForm,
});
