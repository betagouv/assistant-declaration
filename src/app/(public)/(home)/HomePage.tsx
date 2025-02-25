'use client';

import Grid from '@mui/material/Grid';

import { Introduction } from '@ad/src/app/(public)/(home)/Introduction';

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
    </Grid>
  );
}
