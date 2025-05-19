'use client';

import { Grid } from '@mui/material';

import { Introduction } from '@ad/src/app/(public)/(home)/Introduction';
import { Partners } from '@ad/src/app/(public)/(home)/Partners';
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
      <Partners />
      <FrequentlyAskedQuestions />
    </Grid>
  );
}
