'use client';

import superjson from 'superjson';

import { createHydrateClient } from '@ad/src/server/HydrateClient';

export const HydrateClient = createHydrateClient({
  transformer: superjson,
});
