import { createContext } from 'react';

import { DeclarationHeader } from '@ad/src/components/DeclarationHeader';

export const SacdDeclarationPageContext = createContext({
  ContextualDeclarationHeader: DeclarationHeader,
});
