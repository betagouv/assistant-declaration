'use client';

import { Grid } from '@mui/material';

import { FrequentlyAskedQuestions } from '@ad/src/app/(public)/frequently-asked-questions/FrequentlyAskedQuestions';

export function FrequentlyAskedQuestionsPage() {
  return (
    <Grid
      container
      sx={{
        display: 'block',
        mx: 'auto',
      }}
    >
      <FrequentlyAskedQuestions />
    </Grid>
  );
}
