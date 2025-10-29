import { createContext } from 'react';

import { Uploader } from '@ad/src/components/uploader/Uploader';

export const DeclarationPageContext = createContext({
  ContextualUploader: Uploader,
});
