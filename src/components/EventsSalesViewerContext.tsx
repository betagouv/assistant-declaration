import { createContext } from 'react';

import { EventsSalesOverview } from '@ad/src/components/EventsSalesOverview';

export const EventsSalesViewerContext = createContext({
  ContextualEventsSalesOverview: EventsSalesOverview,
});
