'use client';

import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { PropsWithChildren, useContext } from 'react';
import { I18nextProvider } from 'react-i18next';

import { ProvidersContext } from '@ad/src/app/ProvidersContext';
import { TrpcClientProvider } from '@ad/src/client/TrpcClientProvider';
import { ModalProvider } from '@ad/src/components/modal/ModalProvider';
import { dateFnsLocales, i18n } from '@ad/src/i18n';

// [IMPORTANT] Some providers rely on hooks so we extracted them from here so this can be reused in Storybook without a burden
// Consider `Providers` as something common to both Storybook and the runtime application

export interface ProvidersProps {
  nonce?: string;
}

export function Providers(props: PropsWithChildren<ProvidersProps>) {
  const { ContextualSessionProvider } = useContext(ProvidersContext);

  const cache = createCache({
    key: 'assistant-declaration', // To avoid conflicts in the same app (ref: https://emotion.sh/docs/@emotion/cache#key)
    nonce: props.nonce,
    prepend: true,
  });

  return (
    <CacheProvider value={cache}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateFnsLocales[i18n.language]}>
        <TrpcClientProvider>
          <I18nextProvider i18n={i18n}>
            <ModalProvider>
              <ContextualSessionProvider>{props.children}</ContextualSessionProvider>
            </ModalProvider>
          </I18nextProvider>
        </TrpcClientProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
}
