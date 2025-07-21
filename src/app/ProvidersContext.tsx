import { createContext } from 'react';

import { SessionProvider } from '@ad/src/proxies/next-auth/react';

export const ProvidersContext = createContext({
  ContextualSessionProvider: SessionProvider,
});
