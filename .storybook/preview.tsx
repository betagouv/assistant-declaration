import MuiDsfrThemeProvider from '@codegouvfr/react-dsfr/mui';
import { MDXProvider } from '@mdx-js/react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { DocsContainerProps } from '@storybook/addon-docs/blocks';
import { withLinks } from '@storybook/addon-links';
import type { Preview } from '@storybook/react';
import { withMockAuth } from '@tomfreudenberg/next-auth-mock/storybook';
import { passthrough } from 'msw';
import { initialize, mswLoader } from 'msw-storybook-addon';
import React, { PropsWithChildren, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { configure as testingConfigure } from 'storybook/test';
import { themes } from 'storybook/theming';

import { MockProvider } from '@ad/.storybook/MockProvider';
import { ThemedDocsContainer } from '@ad/.storybook/ThemedDocsContainer';
// import { DARK_MODE_EVENT_NAME, UPDATE_DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';
import { disableGlobalDsfrStyle } from '@ad/.storybook/helpers';
import '@ad/.storybook/layout.scss';
import { withDisablingTestRunner } from '@ad/.storybook/testing';
// import { useDarkMode } from 'storybook-dark-mode';
import { Providers } from '@ad/src/app/Providers';
import '@ad/src/assets/fonts/index.css';
import { DsfrProvider, StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { DsfrHead, getHtmlAttributes } from '@ad/src/dsfr-bootstrap/server-only-index';
import { i18n } from '@ad/src/i18n';
import { useMDXComponents } from '@ad/src/mdx-components';

// const channel = addons.getChannel();

// [WORKAROUND] Since `react-dsfr` no longer passes the color scheme through `DsfrProvider` and `DsfrHead` we call this function to avoid an assert error
getHtmlAttributes({ lang: 'fr' });

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    // When using test runners they may inherit from system settings or the dark mode addon
    // which is not wanted. So each test make sure to manually set `light` or `dark` as color scheme.
    // The tricky part is `testing-library` and/or `playwright` have not access to the `jsdom` to manipulate the DOM (and it's not possible to set it up due to Storybook testing logic)
    // so we emulate a media query into the testing browser that we listen changes from, like that we can change the theming.
    // Note: we didn't scope it to tests otherwise we should hack a bit to inject a variable into the `window` to read it... but it's unlikely you will change your OS color settings while developing :)
    const newColorScheme = event.matches ? 'dark' : 'light';

    document.documentElement.dataset.theme = newColorScheme;
    document.documentElement.dataset.frTheme = newColorScheme;
    document.documentElement.dataset.frScheme = newColorScheme;
  });
}

// Initialize MSW
const mswServerSingleton = initialize({
  onUnhandledRequest: (request, print) => {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      // If API calls are not handled it means they are missing handlers for the server mock
      print.error();
    } else {
      // Otherwise let XHR library get local files, favicon...
      passthrough();
    }
  },
});

// Increase the timeout because when testing (test runners or interactions panel) all async methods like `findBy`
// have 1 second of timeout, this is sometimes too short when there are multiple loadings behind
testingConfigure({ asyncUtilTimeout: 10 * 1000 });

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    option: {},
    backgrounds: {
      disable: true,
    },
    darkMode: {
      current: 'light',
      stylePreview: true,
      dark: { ...themes.dark },
      light: { ...themes.light },
    },
    docs: {
      container: (props: PropsWithChildren<DocsContainerProps>) => {
        // const [isDark, setDark] = React.useState();

        //
        // TODO: `channel` not available for now since upgrade to Storybook v7
        //

        // const onChangeHandler = () => {
        //   channel.emit(UPDATE_DARK_MODE_EVENT_NAME);
        // };

        // React.useEffect(() => {
        //   channel.on(DARK_MODE_EVENT_NAME, setDark);
        //   return () => channel.removeListener(DARK_MODE_EVENT_NAME, setDark);
        // }, [channel, setDark]);

        return (
          <div>
            {/* <input type="checkbox" onChange={onChangeHandler} /> */}
            <ThemedDocsContainer {...props} />
          </div>
        );
      },
    },
    a11y: {
      config: {
        rules: [
          {
            // TODO: for now the user avatar background color is generated with a simple algorithm but does not respect the ratio
            id: 'color-contrast',
            selector: '*:not(.MuiAvatar-circular.UserAvatar)',
          },
          {
            // A layout footer button targets a theming modal that we do not render to keep things simple, ignore this button violation
            id: 'aria-valid-attr-value',
            selector: '*:not([aria-controls="fr-theme-modal"])',
          },
          {
            // When using the `DataGrid` it says: "Element has children which are not allowed"
            // whereas it has `role="rowgroup"` as direct nested elements... it seems a false-positive so ignoring it
            // (multiple posts on internet mentions this wrong trigger)
            id: 'aria-required-children',
            selector: '*:not(.MuiDataGrid-root)',
          },
          {
            // Cannot add the missign piece triggering the error
            id: 'scrollable-region-focusable',
            selector: '*:not(.MuiDataGrid-virtualScroller)',
          },
          {
            // `react-dsfr` uses the same id for desktop and mobile for their quick access items
            id: 'duplicate-id-active',
            selector: '*:not([id^="fr-header-quick-access-item"])',
          },
          {
            // We use a number input with combobox and it seems non-standard, so silenting seems for our use case it's justified
            id: 'aria-allowed-role',
            selector: '*:not([role="combobox"][type="number"])',
          },
        ],
      },
    },
  },
  loaders: [mswLoader],
  decorators: [
    withLinks,
    withMockAuth,
    (Story, context) => {
      // Provide the necessary depending on the context

      const { locale } = context.globals;

      // When the locale global changes set the new locale in i18n
      useEffect(() => {
        i18n.changeLanguage(locale);
      }, [locale]);

      if (context.kind.startsWith('Emails/')) {
        // We are in the email templating context, they don't need other stuff and they will use a specific decorator per-story

        disableGlobalDsfrStyle(true); // Workaround for global style leaking

        return (
          <I18nextProvider i18n={i18n}>
            <Story />
          </I18nextProvider>
        );
      } else {
        // For now for all other cases we provide the client provider to mock tRPC calls

        disableGlobalDsfrStyle(false); // Workaround for global style leaking

        // Reuse the same MDX modifications logic from Next.js
        const mdxComponents = useMDXComponents({});

        // We provide the client provider to mock tRPC calls
        return (
          <>
            <StartDsfrOnHydration />
            <DsfrHead />
            <MDXProvider components={mdxComponents}>
              <AppRouterCacheProvider>
                <DsfrProvider lang={locale}>
                  <MuiDsfrThemeProvider>
                    <MockProvider>
                      <Providers>
                        <Story />
                      </Providers>
                    </MockProvider>
                  </MuiDsfrThemeProvider>
                </DsfrProvider>
              </AppRouterCacheProvider>
            </MDXProvider>
          </>
        );
      }
    },
    withDisablingTestRunner, // This must be the latest to avoid other decorators to be called
  ],
  globalTypes: {
    // TODO: it appears as selected even if default... which is weird (ref: https://github.com/storybookjs/storybook/issues/20009)
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      defaultValue: 'fr',
      // toolbar: {
      //   icon: 'globe',
      //   items: [{ value: 'fr', right: '🇫🇷', title: 'Français' }],
      //   showName: false,
      // },
    },
  },
  tags: ['autodocs'],
};

export default preview;
