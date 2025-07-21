import { createContext } from 'react';

import { EventsSalesViewer } from '@ad/src/components/EventsSalesViewer';

export const DeclarationHeaderContext = createContext({
  ContextualEventsSalesViewer: EventsSalesViewer,
});
