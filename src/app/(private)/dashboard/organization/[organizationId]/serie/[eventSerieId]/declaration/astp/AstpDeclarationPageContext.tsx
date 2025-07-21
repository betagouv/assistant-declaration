import { createContext } from 'react';

import { DeclarationHeader } from '@ad/src/components/DeclarationHeader';

export const AstpDeclarationPageContext = createContext({
  ContextualDeclarationHeader: DeclarationHeader,
});
