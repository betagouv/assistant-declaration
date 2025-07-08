import { createContext } from 'react';

import { RetrievePasswordForm } from '@ad/src/app/(visitor-only)/auth/password/retrieve/RetrievePasswordForm';

export const ForgottenPasswordPageContext = createContext({
  ContextualRetrievePasswordForm: RetrievePasswordForm,
});
