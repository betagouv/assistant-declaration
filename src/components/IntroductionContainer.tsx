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
  const containerMaxHeightToUse = containerMaxHeight || { sm: 550, xl: 600 };

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
            sm: 'calc(100vh - 120px)',
          },
          maxHeight: containerMaxHeightToUse,
          transition: '0.3s',
        }}
      >
        <Grid container alignItems="center" wrap="nowrap" sx={{ height: '100%', mx: 'auto' }}>
          <Grid item md={8} lg={8} sx={{ m: 'auto' }}>
            {left}
          </Grid>
          <Grid item md={4} lg={4} sx={{ maxHeight: '100%', display: { xs: 'none', md: 'initial' } }}>
            <Box
              ref={rightRef}
              id="introduction-container-right-area"
              aria-hidden="true"
              sx={[
                {
                  display: 'flex',
                  alignItems: 'center',
                  px: '2vw',
                  py: '20px',
                  minWidth: {
                    md: `${100 / (12 / 5)}vw`,
                    lg: `${100 / (12 / 6)}vw`,
                  },
                  minHeight: Math.min(...Object.values<number>(containerMaxHeightToUse)),
                  height: 'calc(100vh - 120px)',
                  maxHeight: containerMaxHeightToUse,
                  transition: 'max-height 0.3s',
                },
                ...(Array.isArray(rightSx) ? rightSx : [rightSx]),
              ]}
            >
              {right}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
