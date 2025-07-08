import { createContext } from 'react';

import { DeclarationHeader } from '@ad/src/components/DeclarationHeader';

export const CnmDeclarationPageContext = createContext({
  ContextualDeclarationHeader: DeclarationHeader,
});
