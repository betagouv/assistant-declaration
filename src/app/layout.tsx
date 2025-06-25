import { Display } from '@codegouvfr/react-dsfr/Display';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { PropsWithChildren } from 'react';

import { Matomo } from '@ad/src/app/Matomo';
import '@ad/src/app/layout.scss';
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
        <DsfrProvider lang={lang}>
          Coucou toi LOL
          {props.children}
          {/* <MuiDsfrThemeProvider>
            <Providers nonce={nonce}>
              <SentryClientProvider>
                <LiveChatProvider>{props.children}</LiveChatProvider>
              </SentryClientProvider>
            </Providers>
          </MuiDsfrThemeProvider> */}
          <Display />
        </DsfrProvider>
        <Matomo nonce={nonce} />
      </body>
    </html>
  );
}

export default RootLayout;
