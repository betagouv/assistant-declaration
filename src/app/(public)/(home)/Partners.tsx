import { fr } from '@codegouvfr/react-dsfr';
import { Box, Container, GridProps, Link, Typography } from '@mui/material';
import { ImgHTMLAttributes } from 'react';

import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';

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
  const { showLiveChat } = useLiveChat();

  return (
    <Container sx={{ pt: 1, pb: { xs: 4, sm: 5, md: 6 } }}>
      <Box
        sx={{
          bgcolor: fr.colors.decisions.background.actionLow.blueFrance.default,
          textAlign: 'center',
          maxWidth: 800,
          mx: 'auto',
          borderRadius: '5px',
          px: 3,
          py: 6,
        }}
      >
        <Typography variant="h6">Vous êtes éditeur ?</Typography>
        <Typography variant="body1">
          <Link
            component="button"
            onClick={showLiveChat}
            underline="none"
            sx={{
              '&::after': {
                display: 'none !important',
              },
            }}
          >
            Contactez notre équipe technique
          </Link>{' '}
          pour proposer le service à vos clients !
        </Typography>
      </Box>
    </Container>
  );
}
