import { Display } from '@codegouvfr/react-dsfr/Display';
import { DsfrHead } from '@codegouvfr/react-dsfr/next-appdir/DsfrHead';
import { DsfrProvider } from '@codegouvfr/react-dsfr/next-appdir/DsfrProvider';
import { getHtmlAttributes } from '@codegouvfr/react-dsfr/next-appdir/getHtmlAttributes';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

import { Matomo } from '@ad/src/app/Matomo';
import { StartDsfr } from '@ad/src/app/StartDsfr';
import '@ad/src/app/layout.scss';

// import { defaultColorScheme } from '@ad/src/utils/dsfr';

export const metadata: Metadata = {
  title: 'Assistant déclaration',
};

export interface RootLayoutProps {
  workaroundForNextJsPages?: boolean;
}

// // [WORKAROUND] Since `react-dsfr` no longer passes the color scheme through `DsfrProvider` and `DsfrHead` we call this function to avoid an assert error in case of `workaroundForNextJsPages: true` usage
// getHtmlAttributes({ defaultColorScheme: 'system' });

function MainStructure({ nonce, ...props }: PropsWithChildren & { nonce?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <StartDsfr />
        <DsfrHead Link={Link} nonce={nonce} />
      </head>
      <body>
        <DsfrProvider>
          Coucou toi LOL
          {/* {props.children} */}
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
    </>
  );
}

export async function RootLayout(props: PropsWithChildren<RootLayoutProps>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') || undefined;

  if (props.workaroundForNextJsPages === true) {
    // When embedded through a server-side only page (for errors for example) `<html>` and `<body>`
    // are already included by Next.js (the browser can ajust the structure but in our case `<html>` duplication
    // throws a visible error in development so we avoid it (it does not change things that much since it's only specific pages))
    return <MainStructure {...props} nonce={nonce} />;
  }

  return (
    <html lang="fr" {...getHtmlAttributes({ defaultColorScheme: 'system' })}>
      <MainStructure {...props} nonce={nonce} />
    </html>
  );
}

export default RootLayout;
