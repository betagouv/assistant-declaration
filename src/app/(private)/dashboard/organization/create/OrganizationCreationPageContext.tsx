import { createContext } from 'react';

import { CreateOrganizationForm } from '@ad/src/app/(private)/dashboard/organization/create/CreateOrganizationForm';

export const OrganizationCreationPageContext = createContext({
  ContextualCreateOrganizationForm: CreateOrganizationForm,
});
