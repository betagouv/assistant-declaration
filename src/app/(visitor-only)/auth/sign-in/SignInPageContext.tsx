import { createContext } from 'react';

import { SignInForm } from '@ad/src/app/(visitor-only)/auth/sign-in/SignInForm';

export const SignInPageContext = createContext({
  ContextualSignInForm: SignInForm,
});
