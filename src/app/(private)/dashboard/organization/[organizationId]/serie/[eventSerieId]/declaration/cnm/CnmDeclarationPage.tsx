'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert, Button, Typography } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { createContext, useContext } from 'react';

import { trpc } from '@ad/src/client/trpcClient';
import { DeclarationHeader } from '@ad/src/components/DeclarationHeader';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventsSalesOverview } from '@ad/src/components/EventsSalesOverview';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export const CnmDeclarationPageContext = createContext({
  ContextualEventsSalesOverview: EventsSalesOverview,
});

export interface CnmDeclarationPageProps {
  params: { organizationId: string; eventSerieId: string };
}

export function CnmDeclarationPage({ params: { organizationId, eventSerieId } }: CnmDeclarationPageProps) {
  const { ContextualEventsSalesOverview } = useContext(CnmDeclarationPageContext);

  const getEventSerie = trpc.getEventSerie.useQuery({
    id: eventSerieId,
  });

  const listEvents = trpc.listEvents.useQuery({
    orderBy: {},
    filterBy: {
      eventSeriesIds: [eventSerieId],
    },
  });

  const aggregatedQueries = new AggregatedQueries(getEventSerie, listEvents);

  if (aggregatedQueries.isLoading) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (aggregatedQueries.hasError) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
      </Grid>
    );
  }

  const eventSerie = getEventSerie.data!.eventSerie;
  const eventsWrappers = listEvents.data!.eventsWrappers; // Descending order (from the API)

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        pb: 3,
      }}
    >
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          bgcolor: fr.colors.decisions.background.alt.pinkMacaron.default,
        }}
      >
        <Container>
          <DeclarationHeader organizationId={organizationId} eventSerie={eventSerie} currentDeclaration="cnm" />
        </Container>
      </Container>
      {eventsWrappers.length > 0 ? (
        <>
          <Container
            sx={{
              bgcolor: fr.colors.decisions.background.alt.blueFrance.default,
              borderRadius: '8px',
              pt: { xs: 1, md: 1 },
              pb: { xs: 1, md: 1 },
              mt: 3,
            }}
          >
            <ContextualEventsSalesOverview wrappers={eventsWrappers} eventSerie={eventSerie} roundValuesForCopy={true} />
          </Container>
          <Container sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sx={{ textAlign: 'center' }}>
                <Button
                  component={NextLink}
                  href="https://monespacepro.cnm.fr/taxe/declarations"
                  target="_blank"
                  onClick={() => {
                    push(['trackEvent', 'declaration', 'openOfficialWebsite', 'type', DeclarationTypeSchema.Values.CNM]);
                  }}
                  size="large"
                  variant="contained"
                  sx={{
                    my: 5,
                    '&::after': {
                      display: 'none !important',
                    },
                  }}
                >
                  Commencer la déclaration en ligne auprès du CNM
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="warning">
                  Notre service n&apos;effectue pas de télétransmission.{' '}
                  <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'bold' }}>
                    Il vous incombe de transmettre le résumé des données de billetterie sur le site du CNM. Et de vous assurer de l&apos;exactitude
                    des informations saisies.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Container>
        </>
      ) : (
        <Container
          sx={{
            py: 3,
          }}
        >
          <Grid container spacing={2} justifyContent="center" sx={{ pt: 3 }}>
            <Grid item xs={12} sx={{ py: 2 }}>
              Aucune date n&apos;a pu être récupérée pour ce spectacle. Il n&apos;y a donc aucune déclaration à faire au CNM.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
