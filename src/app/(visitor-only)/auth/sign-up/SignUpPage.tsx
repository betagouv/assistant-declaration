'use client';

import { fr } from '@codegouvfr/react-dsfr';
import humanCooperation from '@gouvfr/dsfr/dist/artwork/pictograms/environment/human-cooperation.svg';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { createContext, useContext } from 'react';

import { SignUpForm } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpForm';
import { formTitleProps } from '@ad/src/utils/form';
import { centeredFormContainerGridProps } from '@ad/src/utils/grid';

export const SignUpPageContext = createContext({
  ContextualSignUpForm: SignUpForm,
});

export function SignUpPage() {
  const { ContextualSignUpForm } = useContext(SignUpPageContext);

  return (
    <Grid container>
      <Grid item xs={12} lg={6} sx={{ display: 'flex', justifyContent: 'center' }}>
        <Grid container {...centeredFormContainerGridProps}>
          <Typography component="h1" {...formTitleProps}>
            Inscription
          </Typography>
          <ContextualSignUpForm />
        </Grid>
      </Grid>
      <Grid
        item
        xs={12}
        lg={6}
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
        <Image
          src={humanCooperation}
          alt=""
          priority={true}
          style={{
            backgroundColor: '#f5f5fe', // [WORKAROUND] Simple hack since DSFR does not provide pictograms in dark mode
            width: '90%',
            height: 'auto',
            maxHeight: 250,
            objectFit: 'contain',
          }}
        />
        <Typography component="div" variant="body1" sx={{ pt: '40px' }}>
          <Typography sx={{ fontWeight: 'bold' }}>Les raisons de s&apos;inscrire sur la plateforme :</Typography>
          <ol>
            <li>Un lien direct entre vos données de billetterie et vos déclarations</li>
            <li>Centraliser gratuitement vos étapes de déclarations</li>
            <li>Ne plus garder de données spectateurs sensibles sur votre ordinateur</li>
            <li>Bénéficier d&apos;un outil qui évolue au fil de vos retours utilisateurs</li>
          </ol>
        </Typography>
      </Grid>
    </Grid>
  );
}
