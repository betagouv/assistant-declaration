import * as Sentry from '@sentry/nextjs';

import { beforeSend, dsn, environment, release } from '@ad/src/utils/sentry';

const hasReplays = true;
const integrations: any[] = [];

if (hasReplays) {
  integrations.push(
    Sentry.replayIntegration({
      // Browse the app and force a manual error to be able to check the rrweb record.
      // You may find some elements not hidden and need to use `data-sentry-block` or `data-sentry-mask`
      // Note: the class is the only way for us to target Crisp client to keep conversations private
      maskAllInputs: true,
      block: ['[data-sentry-block]', '.crisp-client'],
      mask: ['[data-sentry-mask]', '.crisp-client'],
    })
  );
}

Sentry.init({
  dsn: dsn,
  environment: environment,
  debug: false,
  release: release,
  integrations,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  transportOptions: {},
  beforeSend: beforeSend,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
