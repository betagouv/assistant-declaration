'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import { Grid, Link, Typography } from '@mui/material';
import Image from 'next/image';
import NextLink from 'next/link';
import { createContext, useContext } from 'react';

import { SignInForm } from '@ad/src/app/(visitor-only)/auth/sign-in/SignInForm';
import assistant from '@ad/src/assets/images/sign-in/assistant.svg';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredFormContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export const SignInPageContext = createContext({
  ContextualSignInForm: SignInForm,
});

export function SignInPage() {
  const { ContextualSignInForm } = useContext(SignInPageContext);
  const { isDark } = useIsDark();

  return (
    <Grid container>
      <Grid
        item
        xs={12}
        lg={7}
        container
        direction={'column'}
        sx={{
          background: fr.colors.decisions.background.alt.blueFrance.default,
          px: 6,
          py: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Grid
          container
          spacing={1}
          sx={{
            maxWidth: 800,
            alignItems: 'center',
            ml: 'auto',
            flexGrow: 1,
          }}
        >
          <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography component="div" variant="h2">
              Simplifiez vos déclarations de spectacle
            </Typography>
            <Typography component="div" variant="body1" sx={{ my: { xs: 1, md: 3 } }}>
              L&apos;Assistant déclaration collecte les données de billetterie afin de simplifier vos déclarations SACEM, SACD, ASTP, CNM.
            </Typography>
            <Typography component="div" variant="body1">
              <Link component={NextLink} href={linkRegistry.get('home', undefined)} variant="body1" underline="none">
                <span className={fr.cx('fr-icon--sm', 'fr-icon-arrow-right-line')} style={{ marginRight: 5 }} />
                En savoir plus
              </Link>
            </Typography>
          </Grid>
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              height: '100%',
              maxHeight: { xs: 200, md: 400 },
            }}
          >
            <Image
              src={assistant}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: isDark ? 'invert(100%)' : undefined,
              }}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid
        item
        xs={12}
        lg={5}
        sx={{
          display: 'flex',
        }}
      >
        <Grid container {...centeredFormContainerGridProps}>
          <Typography component="h1" {...formTitleProps}>
            Créer un compte
          </Typography>
          <ContextualSignInForm />
        </Grid>
      </Grid>
    </Grid>
  );
}
