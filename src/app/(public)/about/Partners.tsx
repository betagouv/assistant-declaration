import { fr } from '@codegouvfr/react-dsfr';
import { Box, Container, Link, Typography } from '@mui/material';

import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';

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
        <Typography component="span" variant="h6">
          Vous êtes éditeur ?
        </Typography>
        <Typography variant="body1">
          <Link
            component="button"
            onClick={showLiveChat}
            sx={{
              top: -1, // Just due to the button among text, could use flex parent too
              textUnderlineOffset: 3,
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
