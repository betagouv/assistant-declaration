#!/usr/bin/env node
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import { program } from '@ad/src/cli/program';
import { beforeSend, dsn, environment, release } from '@ad/src/utils/sentry';
import { gracefulExit, registerGracefulExit } from '@ad/src/utils/system';

// Note `uncaughtException` and `unhandledRejection` events are watched by default
Sentry.init({
  dsn: dsn,
  environment: environment,
  debug: false,
  release: release,
  integrations: [
    // Profiling is disabled for now because it watches transactions and may affect performance
    // nodeProfilingIntegration(),
  ],
  beforeSend: beforeSend,
  // tracesSampleRate: 1.0,
  // profilesSampleRate: 1.0,
});

registerGracefulExit();

// This would break imports from Next.js so isolating it to be run only by CLI
program.parseAsync().catch((error) => {
  gracefulExit(error);
});
