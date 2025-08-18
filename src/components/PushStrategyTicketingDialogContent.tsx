import { Alert, Grid, Link, Typography } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';

import { CopiableField } from '@ad/src/components/CopiableField';

export interface PushStrategyTicketingDialogContentProps {
  ticketingSystemName: string;
  accessKey: string;
  secretKey: string;
}

export function PushStrategyTicketingDialogContent(props: PushStrategyTicketingDialogContentProps) {
  return (
    <>
      Vous devez maintenant configurer les identifiants suivants dans l&apos;outil de votre éditeur de billetterie afin qu&apos;il puisse nous
      transférer les données de billetterie. Vous pouvez vous aider{' '}
      <Link
        component={NextLink}
        href={`https://atelier-numerique.notion.site/connecter-${props.ticketingSystemName.toLowerCase()}`}
        target="_blank"
        onClick={() => {
          push(['trackEvent', 'ticketing', 'openHowTo', 'system', props.ticketingSystemName]);
        }}
        underline="none"
        sx={{
          '&::after': {
            display: 'none !important',
          },
        }}
      >
        de notre tutoriel
      </Link>
      .
      <Alert severity="warning" sx={{ mt: 3, mb: 4 }}>
        <Typography sx={{ fontWeight: 'bold' }}>
          Pour des raisons de sécurité, la clé d&apos;accès n&apos;est visible qu&apos;une seule fois.
        </Typography>
        Si vous ne configurez pas tout de suite votre outil de billetterie, gardez temporairement la clé d&apos;accès dans un fichier sur votre
        ordinateur.
      </Alert>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <CopiableField label="Identifiant" value={props.accessKey} copyAriaLabel="copier l'identifiant" fullWidth data-sentry-mask />
        </Grid>
        <Grid item xs={12}>
          <CopiableField label="Jeton d'accès" value={props.secretKey} copyAriaLabel="copier le jeton d'accès" fullWidth data-sentry-mask />
        </Grid>
      </Grid>
    </>
  );
}
