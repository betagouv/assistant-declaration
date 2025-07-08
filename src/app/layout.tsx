import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { PropsWithChildren } from 'react';

import { Matomo } from '@ad/src/app/Matomo';
import { MuiDsfrThemeProvider } from '@ad/src/app/MuiDsfrThemeProvider';
import { Providers } from '@ad/src/app/Providers';
import { SentryClientProvider } from '@ad/src/app/SentryClientProvider';
import '@ad/src/app/layout.scss';
import { LiveChatProvider } from '@ad/src/components/live-chat/LiveChatProvider';
import { DsfrProvider } from '@ad/src/dsfr-bootstrap';
import { DsfrHead, getHtmlAttributes } from '@ad/src/dsfr-bootstrap/server-only-index';

export const metadata: Metadata = {
  title: 'Assistant déclaration',
};

export interface RootLayoutProps {}

export async function RootLayout(props: PropsWithChildren<RootLayoutProps>) {
  const lang = 'fr';

  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') || undefined;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/html-has-lang */}
      <html {...getHtmlAttributes({ lang })}>
        <head>
          <DsfrHead
            nonce={nonce}
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
                <Providers nonce={nonce}>
                  <SentryClientProvider>
                    <LiveChatProvider>{props.children}</LiveChatProvider>
                  </SentryClientProvider>
                </Providers>
              </MuiDsfrThemeProvider>
            </DsfrProvider>
          </AppRouterCacheProvider>
          <Matomo nonce={nonce} />
        </body>
      </html>
    </>
  );
}

export default RootLayout;
