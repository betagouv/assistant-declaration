import { createContext } from 'react';

import { SignUpForm } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpForm';

export const SignUpPageContext = createContext({
  ContextualSignUpForm: SignUpForm,
});
