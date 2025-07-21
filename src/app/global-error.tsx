'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { MuiDsfrThemeProvider } from '@ad/src/app/MuiDsfrThemeProvider';
import '@ad/src/app/layout.scss';
import { ErrorPage, error500Props } from '@ad/src/components/ErrorPage';
import { LiveChatProvider } from '@ad/src/components/live-chat/LiveChatProvider';
import { DsfrProvider } from '@ad/src/dsfr-bootstrap';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { DsfrHead, getHtmlAttributes } from '@ad/src/dsfr-bootstrap/server-only-index';

export function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  // Report to Sentry as unexpected
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  //
  // Since `global-error.tsx` needs to set from scratch the HTML structure  whereas it's only a client component, so:
  // 1. We cannot access nonce to set scripts, it's problematic for live chat for example so the user contacts us (we will use email instead)
  // 2. Cannot initiate the DSFR properly since done server-side now
  //
  // So we consider most of errors caught inside `error.tsx` and those from the layout would just display
  // a basic error block with no other possibility
  //

  // TODO: for now the light/dark from DSFR is failing in development due to an assert (but working in production)

  const lang = 'fr';

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/html-has-lang */}
      <html {...getHtmlAttributes({ lang })}>
        <head>
          <DsfrHead
            // nonce={nonce} // Cannot be retrieved since client side, but it should be fine though
            preloadFonts={[
              //"Marianne-Light",
              //"Marianne-Light_Italic",
              'Marianne-Regular',
              //"Marianne-Regular_Italic",
              'Marianne-Medium',
              //"Marianne-Medium_Italic",
              'Marianne-Bold',
              //"Marianne-Bold_Italic",
              //"Spectral-Regular",
              //"Spectral-ExtraBold"
            ]}
          />
        </head>
        <body>
          <AppRouterCacheProvider>
            <DsfrProvider lang={lang}>
              <MuiDsfrThemeProvider>
                <LiveChatProvider>
                  <StartDsfrOnHydration />
                  <ErrorPage {...error500Props} />
                </LiveChatProvider>
              </MuiDsfrThemeProvider>
            </DsfrProvider>
          </AppRouterCacheProvider>
        </body>
      </html>
    </>
  );
}

export default GlobalError;
