'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert, Box, Button, Container, Grid, Link, Typography } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import Image from 'next/image';
import NextLink from 'next/link';
import { useContext, useMemo } from 'react';

import { AstpDeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/astp/AstpDeclarationPageContext';
import typingImage from '@ad/src/assets/images/declaration/typing.svg';
import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { AggregatedQueries } from '@ad/src/utils/trpc';
import { getBaseUrl } from '@ad/src/utils/url';

export interface AstpDeclarationPageProps {
  params: { organizationId: string; eventSerieId: string };
}

export function AstpDeclarationPage({ params: { organizationId, eventSerieId } }: AstpDeclarationPageProps) {
  const { ContextualDeclarationHeader } = useContext(AstpDeclarationPageContext);

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

  const { transmittedDeclarations } = useMemo(() => {
    return {
      transmittedDeclarations: getEventSerie.data?.partialDeclarations.filter((pD) => pD.transmittedAt !== null).map((pD) => pD.type) ?? [],
    };
  }, [getEventSerie]);

  if (aggregatedQueries.isPending) {
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
          <ContextualDeclarationHeader
            organizationId={organizationId}
            eventSerie={eventSerie}
            eventsWrappers={eventsWrappers}
            currentDeclaration="astp"
            transmittedDeclarations={transmittedDeclarations}
          />
        </Container>
      </Container>
      {eventsWrappers.length > 0 ? (
        <>
          <Container
            sx={{
              p: 1,
              mt: 3,
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box
                  sx={{
                    bgcolor: fr.colors.decisions.background.alt.blueFrance.default,
                    borderRadius: '8px',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6} sx={{ px: 3, display: { xs: 'none', md: 'block' } }}>
                      <Image
                        src={typingImage}
                        alt=""
                        priority={true}
                        style={{
                          width: '100%',
                          maxHeight: 350,
                          objectFit: 'contain',
                          color: undefined, // [WORKAROUND] Ref: https://github.com/vercel/next.js/issues/61388#issuecomment-1988278891
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', p: 3 }}>
                      <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'start' }}>
                        <Typography variant="h4">
                          Utilisez les données ci-dessus pour déclarer votre spectacle en ligne auprès de l&apos;ASTP.
                        </Typography>
                        <Button
                          component={NextLink}
                          href="https://dectanet.astp.asso.fr/mon-espace-declarant/declarer-mes-recettes"
                          target="_blank"
                          onClick={() => {
                            push(['trackEvent', 'declaration', 'openOfficialWebsite', 'type', DeclarationTypeSchema.Values.ASTP]);
                          }}
                          size="large"
                          variant="contained"
                          sx={{
                            mt: 3,
                            '&::after': {
                              display: 'none !important',
                            },
                          }}
                        >
                          Commencer la déclaration
                        </Button>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 3, fontStyle: 'italic' }}>
                        Si vous préférez, il est aussi possible de reporter manuellement les données sur le PDF fourni par l&apos;ASTP (
                        <Link
                          component={NextLink}
                          href={`${getBaseUrl()}/assets/templates/declaration/astp.pdf`}
                          target="_blank"
                          onClick={() => {
                            push(['trackEvent', 'declaration', 'downloadTemplate', 'type', DeclarationTypeSchema.Values.ASTP]);
                          }}
                          underline="none"
                          sx={{
                            '&::after': {
                              display: 'none !important',
                            },
                          }}
                        >
                          téléchargeable ici
                        </Link>
                        ).
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="warning">
                  Notre service n&apos;effectue pas de télétransmission.{' '}
                  <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'bold' }}>
                    Il vous incombe de transmettre votre déclaration à votre interlocuteur ASTP compétent. Et de vous assurer de l&apos;exactitude des
                    informations saisies.
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
              Aucune date n&apos;a pu être récupérée pour ce spectacle. Il n&apos;y a donc aucune déclaration à faire au ASTP.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
