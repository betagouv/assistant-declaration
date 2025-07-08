import { createContext } from 'react';

import { ResetPasswordForm } from '@ad/src/app/(visitor-only)/auth/password/reset/ResetPasswordForm';

export const ResetPasswordPageContext = createContext({
  ContextualResetPasswordForm: ResetPasswordForm,
});
