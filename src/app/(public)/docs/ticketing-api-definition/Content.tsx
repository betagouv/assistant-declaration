'use client';

import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import { useMemo } from 'react';
import { RedocStandalone } from 'redoc';

import { dsfrTheme } from '@ad/src/utils/redoc-theme';

export function Content() {
  const { isDark } = useIsDark();

  const theme = useMemo(() => {
    const tmpTheme = dsfrTheme(isDark);

    return {
      ...tmpTheme,
      breakpoints: {
        ...tmpTheme.breakpoints,
        // Since using an additional sidebar we adjust default breakpoints to make the content readable enough
        small: '1300px',
        medium: '1800px',
        large: '2200px',
      },
    };
  }, [isDark]);

  return (
    <>
      <RedocStandalone
        specUrl="/openapi.json"
        options={{
          nativeScrollbars: false,
          theme: theme,
        }}
      />
    </>
  );
}
