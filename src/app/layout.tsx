import { Display } from '@codegouvfr/react-dsfr/Display';
import { DsfrHead } from '@codegouvfr/react-dsfr/next-appdir/DsfrHead';
import { DsfrProvider } from '@codegouvfr/react-dsfr/next-appdir/DsfrProvider';
import { getHtmlAttributes } from '@codegouvfr/react-dsfr/next-appdir/getHtmlAttributes';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

import { Matomo } from '@ad/src/app/Matomo';
import { MuiDsfrThemeProvider } from '@ad/src/app/MuiDsfrThemeProvider';
import { SentryClientProvider } from '@ad/src/app/SentryClientProvider';
import { StartDsfr } from '@ad/src/app/StartDsfr';
import '@ad/src/app/layout.scss';
import { Providers } from '@ad/src/app/providers';
import { LiveChatProvider } from '@ad/src/components/live-chat/LiveChatProvider';
import { defaultColorScheme } from '@ad/src/utils/dsfr';

export const metadata: Metadata = {
  title: 'Assistant déclaration',
};

export interface RootLayoutProps {
  workaroundForNextJsPages?: boolean;
}

// [WORKAROUND] Since `react-dsfr` no longer passes the color scheme through `DsfrProvider` and `DsfrHead` we call this function to avoid an assert error in case of `workaroundForNextJsPages: true` usage
getHtmlAttributes({ defaultColorScheme });

function MainStructure(props: PropsWithChildren) {
  const nonce = headers().get('x-nonce') || undefined;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <StartDsfr />
        <DsfrHead Link={Link} nonce={nonce} />
      </head>
      <body>
        <DsfrProvider>
          <MuiDsfrThemeProvider>
            <Providers nonce={nonce}>
              <SentryClientProvider>
                <LiveChatProvider>{props.children}</LiveChatProvider>
              </SentryClientProvider>
            </Providers>
          </MuiDsfrThemeProvider>
          <Display />
        </DsfrProvider>
        <Matomo nonce={nonce} />
      </body>
    </>
  );
}

export function RootLayout(props: PropsWithChildren<RootLayoutProps>) {
  if (props.workaroundForNextJsPages === true) {
    // When embedded through a server-side only page (for errors for example) `<html>` and `<body>`
    // are already included by Next.js (the browser can ajust the structure but in our case `<html>` duplication
    // throws a visible error in development so we avoid it (it does not change things that much since it's only specific pages))
    return <MainStructure {...props} />;
  }

  return (
    <html lang="fr" {...getHtmlAttributes({ defaultColorScheme })}>
      <MainStructure {...props} />
    </html>
  );
}

export default RootLayout;
