'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { ContentCopy } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingButton as Button } from '@mui/lab';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Grid,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { ClipboardTicketingEventsSales } from '@ad/src/components/ClipboardTicketingEventsSales';
import { ClipboardTicketingKeyFigures } from '@ad/src/components/ClipboardTicketingKeyFigures';
import { ClipboardTrigger } from '@ad/src/components/ClipboardTrigger';
import { EventSalesTable } from '@ad/src/components/EventSalesTable';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
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

  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);
  const collapseAllAccordions = useCallback(() => setExpandedAccordions([]), []);
  const expandAllAccordions = useCallback(() => setExpandedAccordions(wrappers.map((eW) => eW.event.id)), [wrappers]);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const [triggerKeyFiguresCopy, setTriggerKeyFiguresCopy] = useState(false);
  const [triggerEventsSalesCopy, setTriggerEventsSalesCopy] = useState(false);
  const [eventsWrappersToCopy, setEventsWrappersToCopy] = useState<EventWrapperSchemaType[]>([]);

  const { totalIncludingTaxesAmount, totalExcludingTaxesAmount, totalTaxesAmount, averageTicketPrice, paidTickets, freeTickets } = useMemo(() => {
    let totalIncludingTaxesAmount: number = 0;
    let paidTickets: number = 0;
    let freeTickets: number = 0;

    for (const eventWrapper of wrappers) {
      for (const eventSale of eventWrapper.sales) {
        const total = eventSale.eventCategoryTickets.totalOverride ?? eventSale.eventCategoryTickets.total;
        const price = eventSale.eventCategoryTickets.priceOverride ?? eventSale.ticketCategory.price;

        if (price === 0) {
          freeTickets += total;
        } else {
          paidTickets += total;
        }

        totalIncludingTaxesAmount += total * price;
      }
    }

    // Round to 2 cents for clarity
    const averageTicketPrice = Math.round((totalIncludingTaxesAmount / (freeTickets + paidTickets)) * 100) / 100;

    return {
      totalIncludingTaxesAmount: totalIncludingTaxesAmount,
      totalExcludingTaxesAmount: getExcludingTaxesAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate),
      totalTaxesAmount: getTaxAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate),
      averageTicketPrice: averageTicketPrice,
      paidTickets: paidTickets,
      freeTickets: freeTickets,
    };
  }, [wrappers, eventSerie.taxRate]);

  const { totalIncludingTaxesAmountForCopy, totalExcludingTaxesAmountForCopy, totalTaxesAmountForCopy, averageTicketPriceForCopy } = useMemo(() => {
    if (roundValuesForCopy === true) {
      const includingTaxesAmount = Math.round(totalIncludingTaxesAmount);
      const excludingTaxesAmount = Math.round(totalExcludingTaxesAmount);

      return {
        totalIncludingTaxesAmountForCopy: includingTaxesAmount,
        totalExcludingTaxesAmountForCopy: excludingTaxesAmount,
        totalTaxesAmountForCopy: Math.round(includingTaxesAmount - excludingTaxesAmount), // It cannot be done other way since rounding could mess to always have "exc + tax = inc"
        averageTicketPriceForCopy: Math.round(averageTicketPrice),
      };
    } else {
      return {
        totalIncludingTaxesAmountForCopy: totalIncludingTaxesAmount,
        totalExcludingTaxesAmountForCopy: totalExcludingTaxesAmount,
        totalTaxesAmountForCopy: totalTaxesAmount,
        averageTicketPriceForCopy: averageTicketPrice,
      };
    }
  }, [totalIncludingTaxesAmount, totalExcludingTaxesAmount, totalTaxesAmount, averageTicketPrice, roundValuesForCopy]);

  const [snackbarAlert, setSnackbarAlert] = useState<JSX.Element | null>(null);
  const handleCloseSnackbar = useCallback(() => setSnackbarAlert(null), [setSnackbarAlert]);

  const copyValue = useCallback(
    async (value: string, roundedValue?: boolean) => {
      await navigator.clipboard.writeText(value);

      setSnackbarAlert(
        <Alert severity="success" onClose={handleCloseSnackbar}>
          {roundedValue ? `La valeur arrondie a été copiée` : `La valeur a été copiée`}
        </Alert>
      );
    },
    [setSnackbarAlert, handleCloseSnackbar]
  );

  return (
    <>
      <Grid container spacing={1} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
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
        <Grid item xs={12}>
          <Typography component="div" variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            Synthèse des données de billetterie
            {triggerKeyFiguresCopy && (
              <ClipboardTrigger
                onCopy={() => {
                  setTriggerKeyFiguresCopy(false);

                  push(['trackEvent', 'declaration', 'copyKeyFigures']);
                }}
              >
                <ClipboardTicketingKeyFigures
                  eventSerieName={eventSerie.name}
                  startAt={eventSerie.startAt}
                  endAt={eventSerie.endAt}
                  eventsCount={wrappers.length}
                  totalIncludingTaxesAmount={totalIncludingTaxesAmount}
                  taxRate={eventSerie.taxRate}
                  averageTicketPrice={averageTicketPrice}
                  paidTickets={paidTickets}
                  freeTickets={freeTickets}
                />
              </ClipboardTrigger>
            )}
            <Tooltip title={'Copier le tableau des chiffres clés pour Excel, Word...'} sx={{ ml: 1 }}>
              <IconButton
                onClick={async () => {
                  setTriggerKeyFiguresCopy(true);
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Box
            sx={{
              bgcolor: fr.colors.decisions.background.default.grey.default,
              borderRadius: '8px',
              py: 3,
              px: 3,
              mt: 1,
              mb: 3,
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date"
                  value={`${t('date.short', { date: eventSerie.startAt })}  →  ${t('date.short', {
                    date: eventSerie.endAt,
                  })}`}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(
                          `${t('date.short', { date: eventSerie.startAt })} - ${t('date.short', {
                            date: eventSerie.endAt,
                          })}`
                        );

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'date']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre de représentations"
                  value={t('number.default', {
                    number: wrappers.length,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(wrappers.length.toString());

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'eventsCount']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Recette de billetterie HT"
                  value={t('currency.amount', {
                    amount: totalExcludingTaxesAmount,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(t('number.defaultWithNoGrouping', { number: totalExcludingTaxesAmountForCopy }), true);

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'totalExcludingTaxesAmount']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Recette de billetterie TTC"
                  value={t('currency.amount', {
                    amount: totalIncludingTaxesAmount,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(t('number.defaultWithNoGrouping', { number: totalIncludingTaxesAmountForCopy }), true);

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'totalIncludingTaxesAmount']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Taux de TVA"
                  value={t('number.percent', {
                    percentage: eventSerie.taxRate,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(t('number.defaultWithNoGrouping', { number: 100 * eventSerie.taxRate }));

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'taxRate']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Montant de TVA"
                  value={t('currency.amount', {
                    amount: totalTaxesAmount,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(t('number.defaultWithNoGrouping', { number: totalTaxesAmountForCopy }), true);

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'totalTaxAmount']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre d'entrées payantes"
                  value={t('number.default', {
                    number: paidTickets,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(paidTickets.toString());

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'paidTickets']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre d'entrées gratuites"
                  value={t('number.default', {
                    number: freeTickets,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(freeTickets.toString());

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'freeTickets']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre total d'entrées"
                  value={t('number.default', {
                    number: freeTickets + paidTickets,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue((freeTickets + paidTickets).toString());

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'ticketsCount']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Tarif moyen du billet TTC"
                  value={t('currency.amount', {
                    amount: averageTicketPrice,
                  })}
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      onClick: async () => {
                        await copyValue(t('number.defaultWithNoGrouping', { number: averageTicketPriceForCopy }), true);

                        push(['trackEvent', 'declaration', 'copyKeyFigureValue', 'key', 'averageTicketPrice']);
                      },
                    },
                    htmlInput: {
                      readOnly: true,
                    },
                  }}
                  variant="standard"
                  size="small"
                  fullWidth
                  sx={{
                    input: { cursor: 'pointer' },
                    '.MuiFormLabel-root': { cursor: 'pointer' },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
      {!!snackbarAlert && (
        <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={4000}>
          {snackbarAlert}
        </Snackbar>
      )}
    </>
  );
}
