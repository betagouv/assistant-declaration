'use client';

import { fr } from '@codegouvfr/react-dsfr';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Button, Typography } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventSalesTable } from '@ad/src/components/EventSalesTable';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export interface SacemDeclarationPageProps {
  params: { eventSerieId: string };
}

export function SacemDeclarationPage({ params: { eventSerieId } }: SacemDeclarationPageProps) {
  const { t } = useTranslation('common');

  const updateEventCategoryTickets = trpc.updateEventCategoryTickets.useMutation();

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

  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);
  const collapseAllAccordions = useCallback(() => setExpandedAccordions([]), []);
  const expandAllAccordions = useCallback(() => setExpandedAccordions(listEvents.data!.eventsWrappers.map((eW) => eW.event.id)), [listEvents.data]);

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
        py: 3,
      }}
    >
      <Container>
        <Grid item xs={12} sx={{ pb: 3 }}>
          <Typography component="h1" variant="h5">
            Déclaration SACEM
          </Typography>
          <Typography component="h2" variant="h6">
            {eventSerie.name}
          </Typography>
        </Grid>
      </Container>
      {eventsWrappers.length > 0 ? (
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            bgcolor: fr.colors.decisions.background.alt.blueFrance.default,
            pt: { xs: 3, md: 3 },
            pb: { xs: 3, md: 3 },
          }}
        >
          <Container>
            <Grid container spacing={1} sx={{ my: 1 }}>
              <Grid item xs={12} md={7} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography component="div" variant="h6">
                  Liste des représentations
                </Typography>
              </Grid>
              <Grid item xs={12} md={5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'right' }}>
                {expandedAccordions.length === eventsWrappers.length ? (
                  <Button variant="text" onClick={() => collapseAllAccordions()}>
                    Tout replier
                  </Button>
                ) : (
                  <Button variant="text" onClick={() => expandAllAccordions()}>
                    Tout déplier
                  </Button>
                )}
              </Grid>
            </Grid>
            <Grid container spacing={2} justifyContent="center" sx={{ pt: 3 }}>
              <Grid item xs={12} sx={{ py: 2 }}>
                {eventsWrappers.map((eventsWrapper) => {
                  return (
                    <Accordion
                      key={eventsWrapper.event.id}
                      expanded={expandedAccordions.includes(eventsWrapper.event.id)}
                      onChange={(_, toExpand) => {
                        if (toExpand) {
                          setExpandedAccordions([...expandedAccordions, eventsWrapper.event.id]);
                        } else {
                          setExpandedAccordions(expandedAccordions.filter((id) => id !== eventsWrapper.event.id));
                        }
                      }}
                      sx={{ boxShadow: 'none' }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {capitalizeFirstLetter(t('date.longWithTime', { date: eventsWrapper.event.startAt }))}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {eventsWrapper.sales.length > 0 ? (
                          <EventSalesTable
                            wrapper={eventsWrapper}
                            onRowUpdate={async (updatedRow) => {
                              await updateEventCategoryTickets.mutateAsync({
                                eventCategoryTicketsId: updatedRow.eventCategoryTickets.id,
                                // If the override equals the original value we remove it for the simplicity of understanding for the user (background colors...)
                                priceOverride:
                                  updatedRow.eventCategoryTickets.priceOverride !== updatedRow.ticketCategory.price
                                    ? updatedRow.eventCategoryTickets.priceOverride
                                    : null,
                                totalOverride:
                                  updatedRow.eventCategoryTickets.totalOverride !== updatedRow.eventCategoryTickets.total
                                    ? updatedRow.eventCategoryTickets.totalOverride
                                    : null,
                              });
                            }}
                          />
                        ) : (
                          <>Aucune catégorie de ticket pour cette représentation n&apos;a été trouvée.</>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Grid>
            </Grid>
          </Container>
        </Container>
      ) : (
        <Container
          sx={{
            py: 3,
          }}
        >
          <Grid container spacing={2} justifyContent="center" sx={{ pt: 3 }}>
            <Grid item xs={12} sx={{ py: 2 }}>
              Aucune date n&apos;a pu être récupérée pour cette série de représentations. Il n&apos;y a donc aucune déclaration à faire à la SACEM.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
