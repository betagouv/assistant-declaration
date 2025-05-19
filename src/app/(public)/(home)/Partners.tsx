import { fr } from '@codegouvfr/react-dsfr';
import { Box, Container, Grid, GridProps, Link, Typography } from '@mui/material';
import Image from 'next/image';
import NextLink from 'next/link';
import { ImgHTMLAttributes } from 'react';

import billetweb from '@ad/src/assets/images/partners/billetweb.jpg';
import mapado from '@ad/src/assets/images/partners/billetweb.jpg';
import supersoniks from '@ad/src/assets/images/partners/billetweb.jpg';
import soticket from '@ad/src/assets/images/partners/billetweb.jpg';

export const gridItemProps: GridProps = {
  xs: 6,
  sm: 4,
  md: 3,
  sx: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export const imageProps: ImgHTMLAttributes<HTMLImageElement> = {
  style: {
    width: 'auto',
    maxHeight: '100px',
    objectFit: 'contain',
  },
};

export function Partners() {
  return (
    <Container sx={{ pt: 1, pb: { xs: 4, sm: 5, md: 6 } }}>
      <Typography component="h2" variant="h4" sx={{ textAlign: 'center', mt: 4, mb: { xs: 3, sm: 4 } }}>
        Les éditeurs de billetterie compatibles
      </Typography>
      <Box sx={{ minHeight: { xs: 236, sm: 144, md: 52 } }}>
        <Grid container spacing={4} justifyContent="center">
          <Grid item {...gridItemProps}>
            <Link
              component={NextLink}
              href="https://www.billetweb.fr"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={billetweb} alt="logo de Billetweb" style={{ ...imageProps.style }} />
            </Link>
          </Grid>
          <Grid item {...gridItemProps}>
            <Link
              component={NextLink}
              href="https://www.mapado.com"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={mapado} alt="logo de Mapado" style={{ ...imageProps.style }} />
            </Link>
          </Grid>
          <Grid item {...gridItemProps}>
            <Link
              component={NextLink}
              href="https://supersoniks.com"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={supersoniks} alt="logo de Supersoniks" style={{ ...imageProps.style }} />
            </Link>
          </Grid>
          <Grid item {...gridItemProps}>
            <Link
              component={NextLink}
              href="https://www.socoop.fr"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={soticket} alt="logo de SoTicket" style={{ ...imageProps.style }} />
            </Link>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
