'use client';

import { Grid } from '@mui/material';

import { Introduction } from '@ad/src/app/(public)/(home)/Introduction';
import { KeyReasons } from '@ad/src/app/(public)/(home)/KeyReasons';
import { Partners } from '@ad/src/app/(public)/(home)/Partners';
import { QuickLinks } from '@ad/src/app/(public)/(home)/QuickLinks';
import { FrequentlyAskedQuestions } from '@ad/src/app/(public)/frequently-asked-questions/FrequentlyAskedQuestions';

export function HomePage() {
  return (
    <Grid
      container
      sx={{
        display: 'block',
        mx: 'auto',
      }}
    >
      <Introduction />
      <KeyReasons />
      <QuickLinks />
      <Partners />
      <FrequentlyAskedQuestions />
    </Grid>
  );
}
