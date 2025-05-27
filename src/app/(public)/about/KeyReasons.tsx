import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import { Container, Grid, Typography } from '@mui/material';
import Image from 'next/image';

import clockIsTicking from '@ad/src/assets/images/home/clock-is-ticking.svg';

export function KeyReasons() {
  const { isDark } = useIsDark();

  return (
    <Container sx={{ py: { xs: 4, sm: 5, md: 6 } }}>
      <Grid container spacing={2} sx={{ pt: 3 }}>
        <Grid item xs={12} md={4} lg={5} sx={{ maxHeight: { xs: 200, md: 'unset' } }}>
          <Image
            src={clockIsTicking}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'left',
              filter: isDark ? 'invert(100%)' : undefined,
            }}
          />
        </Grid>
        <Grid item xs={12} md={8} lg={7}>
          <Typography component="div" variant="h3" sx={{ mb: 2 }}>
            Pourquoi un Assistant pour les déclarations du spectacle ?
          </Typography>
          <Typography component="div" variant="body1">
            <span style={{ fontWeight: 'bold' }}>Pour gagner du temps :</span> chaque mois, vous devez déclarer plusieurs fois les mêmes informations
            auprès des organismes. L&apos;Assistant a pour objectif de simplifier cette tâche.
            <br />
            <br />
            Dans sa version actuelle, l&apos;Assistant :
            <ol style={{ fontWeight: 'bold' }}>
              <li>Récupère automatiquement vos données,</li>
              <li>Pré-remplit vos formulaires,</li>
              <li>Accélère vos démarches de déclaration.</li>
            </ol>
            <br />
            La possibilité de télétransmettre les données via l&apos;Assistant sera étudiée dans un second temps.
          </Typography>
        </Grid>
      </Grid>
    </Container>
  );
}
