'use client';

import Grid from '@mui/material/Grid';

import { Introduction } from '@ad/src/app/(public)/(home)/Introduction';
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
      <FrequentlyAskedQuestions />
    </Grid>
  );
}
