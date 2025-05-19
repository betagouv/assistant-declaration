'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { ContentCopy } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingButton as Button } from '@mui/lab';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { ClipboardTicketingEventsSales } from '@ad/src/components/ClipboardTicketingEventsSales';
import { ClipboardTrigger } from '@ad/src/components/ClipboardTrigger';
import { EventSalesTable } from '@ad/src/components/EventSalesTable';
import { EventsSalesKeyFigures } from '@ad/src/components/EventsSalesKeyFigures';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { capitalizeFirstLetter } from '@ad/src/utils/format';

export interface EventsSalesOverviewProps {
  wrappers: EventWrapperSchemaType[];
  eventSerie: EventSerieSchemaType;
  roundValuesForCopy?: boolean; // Some organisms to declare are expected integers
}

export function EventsSalesOverview({ wrappers, eventSerie, roundValuesForCopy }: EventsSalesOverviewProps) {
  const { t } = useTranslation('common');

  const updateEventCategoryTickets = trpc.updateEventCategoryTickets.useMutation();

  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(() => wrappers.map((eW) => eW.event.id));
  const collapseAllAccordions = useCallback(() => setExpandedAccordions([]), []);
  const expandAllAccordions = useCallback(() => setExpandedAccordions(wrappers.map((eW) => eW.event.id)), [wrappers]);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const [triggerEventsSalesCopy, setTriggerEventsSalesCopy] = useState(false);
  const [eventsWrappersToCopy, setEventsWrappersToCopy] = useState<EventWrapperSchemaType[]>([]);

  return (
    <>
      <Grid container spacing={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Grid item>
          <Typography component="div" variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            Liste des représentations
            {triggerEventsSalesCopy && (
              <ClipboardTrigger
                onCopy={() => {
                  setTriggerEventsSalesCopy(false);

                  push(['trackEvent', 'declaration', 'copyEventsSales', 'scope', eventsWrappersToCopy.length > 1 ? 'all' : 'one']);
                }}
              >
                <ClipboardTicketingEventsSales eventSerieName={eventSerie.name} eventsWrappers={eventsWrappersToCopy} />
              </ClipboardTrigger>
            )}
            <Tooltip title={'Copier le tableau des ventes de toutes les représentations pour Excel, Word...'} sx={{ ml: 1 }}>
              <IconButton
                onClick={async () => {
                  setEventsWrappersToCopy(wrappers);
                  setTriggerEventsSalesCopy(true);
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Typography component="div" variant="body2">
            Les valeurs associées aux tickets sont modifiables pour ajuster les totaux à déclarer.
          </Typography>
        </Grid>
        <Grid item sx={{ ml: 'auto' }}>
          {expandedAccordions.length === wrappers.length ? (
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
          {wrappers.map((eventsWrapper) => {
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
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& > .MuiAccordionSummary-content': {
                      gap: 1,
                      flexWrap: 'wrap',
                    },
                  }}
                >
                  <Typography sx={{ display: 'flex', fontWeight: 600 }} data-sentry-mask>
                    {capitalizeFirstLetter(t('date.longWithTime', { date: eventsWrapper.event.startAt }))}
                    <Tooltip title={'Copier le tableau des ventes de cette représentation pour Excel, Word...'} sx={{ ml: 1 }}>
                      <IconButton
                        onClick={async (event) => {
                          setEventsWrappersToCopy([eventsWrapper]);
                          setTriggerEventsSalesCopy(true);

                          event.stopPropagation();
                        }}
                        size="small"
                      >
                        <ContentCopy
                          sx={{
                            fontSize: 13, // It has been chosen to not increase the line height of 24px, it would add too much complexity to try dealing with absolute and ensuring the right available space
                          }}
                        />
                      </IconButton>
                    </Tooltip>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginLeft: 'auto', pr: 2 }}>
                    <Chip
                      label={
                        <>
                          <i className={fr.cx('fr-icon-pantone-line')} />{' '}
                          {eventsWrapper.sales.reduce(
                            (acc, sales) => acc + (sales.eventCategoryTickets.totalOverride ?? sales.eventCategoryTickets.total),
                            0
                          )}
                        </>
                      }
                      aria-label="nombre de billets vendus"
                      sx={{
                        bgcolor: 'var(--background-contrast-brown-opera)',
                        height: 'auto',
                        '& > .MuiChip-label': {
                          whiteSpace: 'pre-wrap !important',
                          wordBreak: 'break-word !important', // Needed in case of word/sentence bigger than parent width
                        },
                        '& ::before': {
                          // Needed since we cannot override the `<i>` icon style since it's a ::before
                          '--icon-size': '1rem !important',
                        },
                      }}
                      data-sentry-mask
                    />
                    <Chip
                      label={`${t('currency.amountWithNoDecimal', {
                        amount: eventsWrapper.sales.reduce(
                          (acc, sales) =>
                            acc +
                            (sales.eventCategoryTickets.totalOverride ?? sales.eventCategoryTickets.total) *
                              (sales.eventCategoryTickets.priceOverride ?? sales.ticketCategory.price),
                          0
                        ),
                      })} TTC`}
                      sx={{
                        bgcolor: 'var(--background-contrast-brown-opera)',
                        height: 'auto',
                        '& > .MuiChip-label': {
                          whiteSpace: 'pre-wrap !important',
                          wordBreak: 'break-word !important', // Needed in case of word/sentence bigger than parent width
                        },
                      }}
                      data-sentry-mask
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {eventsWrapper.sales.length > 0 ? (
                    <EventSalesTable
                      wrapper={eventsWrapper}
                      onRowUpdate={async (updatedRow) => {
                        // The logic is more complex here to provide a feature to override multiple events at once
                        const oldSales = eventsWrapper.sales.find((s) => s.ticketCategory.id === updatedRow.ticketCategory.id)!;
                        const isPriceMutated =
                          updatedRow.eventCategoryTickets.priceOverride !== null &&
                          updatedRow.eventCategoryTickets.priceOverride !== oldSales.eventCategoryTickets.priceOverride;

                        const mutationsToPerform = [
                          updateEventCategoryTickets.mutateAsync({
                            // Since the backend is generating virtual entries to allow the frontend to display them
                            // We make sure to manage the "update process" for virtual ones to be created
                            eventCategoryTicketsId: updatedRow.eventCategoryTickets.id.includes('not_existing_')
                              ? {
                                  eventId: updatedRow.eventCategoryTickets.eventId,
                                  categoryId: updatedRow.eventCategoryTickets.categoryId,
                                }
                              : updatedRow.eventCategoryTickets.id,
                            // If the override equals the original value we remove it for the simplicity of understanding for the user (background colors...)
                            priceOverride:
                              updatedRow.eventCategoryTickets.priceOverride !== updatedRow.ticketCategory.price
                                ? updatedRow.eventCategoryTickets.priceOverride
                                : null,
                            totalOverride:
                              updatedRow.eventCategoryTickets.totalOverride !== updatedRow.eventCategoryTickets.total
                                ? updatedRow.eventCategoryTickets.totalOverride
                                : null,
                          }),
                        ];

                        if (isPriceMutated) {
                          const otherEventsWrappersWithThisTicketCategory = wrappers.filter((eW) => {
                            // Exclude the current one
                            return eW !== eventsWrapper && eW.sales.some((s) => s.ticketCategory.id === updatedRow.ticketCategory.id);
                          });

                          if (otherEventsWrappersWithThisTicketCategory.length > 0) {
                            await new Promise<void>((resolve) => {
                              showConfirmationDialog({
                                description: (
                                  <>
                                    Voulez-vous aussi appliquer le tarif{' '}
                                    <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                      {updatedRow.ticketCategory.name}
                                    </Typography>{' '}
                                    de{' '}
                                    <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                      {t('currency.amount', {
                                        amount: updatedRow.eventCategoryTickets.priceOverride ?? updatedRow.ticketCategory.price,
                                      })}
                                    </Typography>{' '}
                                    sur les autres représentations de{' '}
                                    <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                      {eventSerie.name}
                                    </Typography>{' '}
                                    ?
                                  </>
                                ),
                                onConfirm: async () => {
                                  otherEventsWrappersWithThisTicketCategory.forEach((otherEventsWrapper) => {
                                    const otherWrapperSales = otherEventsWrapper.sales.find(
                                      (s) => s.ticketCategory.id === updatedRow.ticketCategory.id
                                    )!;

                                    mutationsToPerform.push(
                                      updateEventCategoryTickets.mutateAsync({
                                        // Since the backend is generating virtual entries to allow the frontend to display them
                                        // We make sure to manage the "update process" for virtual ones to be created
                                        eventCategoryTicketsId: otherWrapperSales.eventCategoryTickets.id.includes('not_existing_')
                                          ? {
                                              eventId: otherWrapperSales.eventCategoryTickets.eventId,
                                              categoryId: otherWrapperSales.eventCategoryTickets.categoryId,
                                            }
                                          : otherWrapperSales.eventCategoryTickets.id,
                                        // If the override equals the original value we remove it for the simplicity of understanding for the user (background colors...)
                                        priceOverride:
                                          updatedRow.eventCategoryTickets.priceOverride !== otherWrapperSales.ticketCategory.price
                                            ? updatedRow.eventCategoryTickets.priceOverride
                                            : null,
                                        totalOverride:
                                          otherWrapperSales.eventCategoryTickets.totalOverride !== otherWrapperSales.eventCategoryTickets.total
                                            ? otherWrapperSales.eventCategoryTickets.totalOverride
                                            : null,
                                      })
                                    );
                                  });

                                  resolve();
                                },
                                onCancel: async () => {
                                  resolve();
                                },
                              });
                            });
                          }
                        }

                        await Promise.all(mutationsToPerform);

                        push(['trackEvent', 'declaration', 'updateEventSales']);
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
    </>
  );
}
