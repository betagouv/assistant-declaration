import { LoadingButton as Button } from '@mui/lab';
import { Container, Grid, Typography } from '@mui/material';
import NextLink from 'next/link';

import { Widget } from '@ad/src/app/(public)/about/Widget';
import computer from '@ad/src/assets/images/home/computer.svg';
import delivery from '@ad/src/assets/images/home/delivery.svg';
import gesture from '@ad/src/assets/images/home/gesture.svg';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function QuickLinks() {
  return (
    <Container sx={{ pt: { xs: 2, md: 4 }, pb: { xs: 4, md: 8 } }}>
      <Grid container spacing={2} sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}>
        <Grid item xs={12} sm={6} md={4}>
          <Widget icon={delivery} title="Une démo ? Une question ? Un retour sur le service ?">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              N&apos;hésitez pas cela nous aidera à améliorer l&apos;outil.
            </Typography>
            <Button
              component={NextLink}
              href="mailto:contact@assistant-declaration.beta.gouv.fr"
              size="medium"
              variant="contained"
              sx={{ width: 'fit-content', mt: 'auto', mx: 'auto', mb: 4 }}
            >
              Nous contacter
            </Button>
          </Widget>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Widget icon={computer} title="Accéder à l'outil">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Créez votre compte et testez l&apos;outil. Vous serez accompagné pour connecter votre système de billetterie.
            </Typography>
            <Button
              component={NextLink}
              href={linkRegistry.get('dashboard', undefined)}
              size="medium"
              variant="contained"
              sx={{ width: 'fit-content', mt: 'auto', mx: 'auto', mb: 4 }}
            >
              Accéder à l&apos;outil
            </Button>
          </Widget>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Widget icon={gesture} title="Participez à la co-construction">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              L&apos;assistant évolue via une démarche itérative basée sur les retours des utilisateurs. Nous cherchons des testeurs pour
              co-construire.
            </Typography>
            <Button
              component={NextLink}
              href="https://atelier-numerique.notion.site/1fb47c72862480c193c8e7aa3734564b"
              target="_blank"
              size="medium"
              variant="contained"
              sx={{ width: 'fit-content', mt: 'auto', mx: 'auto', mb: 4 }}
            >
              Participer
            </Button>
          </Widget>
        </Grid>
      </Grid>
    </Container>
  );
}
