'use client';

import { createMuiDsfrThemeProvider } from '@codegouvfr/react-dsfr/mui';
import { frFR as coreFrFR } from '@mui/material/locale';

export const { MuiDsfrThemeProvider } = createMuiDsfrThemeProvider({
  augmentMuiTheme: ({ nonAugmentedMuiTheme }) => {
    return {
      ...nonAugmentedMuiTheme,
      components: {
        ...nonAugmentedMuiTheme.components,
        // Bring i18n for components
        ...coreFrFR.components,
        MuiDialogContent: {
          // TODO: remove once the issue is addressed: https://github.com/mui/material-ui/issues/31185
          styleOverrides: { root: { paddingTop: `1rem !important` } },
        },
        MuiButton: {
          styleOverrides: {
            // Remove the shadow
            root: {
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              },
              // For whatever reason having just en empty `styleOverrides` will make buttons using uppercase, not canceling this
              textTransform: 'none',
            },
          },
        },
      },
    };
  },
});
