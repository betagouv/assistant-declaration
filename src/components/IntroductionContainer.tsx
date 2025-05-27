import { fr } from '@codegouvfr/react-dsfr';
import { Box, BoxProps, Container, Grid } from '@mui/material';
import * as React from 'react';

export function IntroductionContainer({
  left,
  right,
  rightRef,
  rightSx,
  containerMaxHeight,
}: {
  left: React.ReactElement;
  right: React.ReactElement;
  rightRef?: React.MutableRefObject<HTMLDivElement | null>;
  rightSx?: BoxProps['sx'];
  containerMaxHeight?: any; // Tried to type `BoxProps['sx']['maxHeight']` but it's not working
}) {
  const containerMaxHeightToUse = containerMaxHeight || 550;

  return (
    <Box
      sx={{
        bgcolor: fr.colors.decisions.background.actionLow.blueFrance.default,
        overflow: 'hidden',
      }}
    >
      <Container
        sx={{
          minHeight: Math.min(...Object.values<number>(containerMaxHeightToUse)),
          height: {
            md: 'calc(100vh - 120px)',
          },
          maxHeight: {
            md: containerMaxHeightToUse,
            xl: containerMaxHeightToUse + 50,
          },
          transition: '0.3s',
        }}
      >
        <Grid container alignItems="center" wrap="nowrap" sx={{ height: '100%', mx: 'auto' }}>
          <Grid item md={7} lg={7} sx={{ m: 'auto' }}>
            {left}
          </Grid>
          <Grid item md={5} lg={5} sx={{ maxHeight: '100%', display: { xs: 'none', md: 'initial' } }}>
            <Box ref={rightRef} id="introduction-container-right-area" aria-hidden="true">
              {right}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
