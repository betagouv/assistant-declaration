'use client';

import { fr } from '@codegouvfr/react-dsfr';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingButton as Button } from '@mui/lab';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Grid, TextField, Tooltip, Typography } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { EventSalesTable } from '@ad/src/components/EventSalesTable';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { capitalizeFirstLetter } from '@ad/src/utils/format';

export interface EventsSalesOverviewProps {
  wrappers: EventWrapperSchemaType[];
  eventSerie: EventSerieSchemaType;
}

export function EventsSalesOverview({ wrappers, eventSerie }: EventsSalesOverviewProps) {
  const { t } = useTranslation('common');

  const updateEventCategoryTickets = trpc.updateEventCategoryTickets.useMutation();

  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);
  const collapseAllAccordions = useCallback(() => setExpandedAccordions([]), []);
  const expandAllAccordions = useCallback(() => setExpandedAccordions(wrappers.map((eW) => eW.event.id)), [wrappers]);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const { totalIncludingTaxesAmount, averageTicketPrice, paidTickets, freeTickets } = useMemo(() => {
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
      averageTicketPrice: averageTicketPrice,
      paidTickets: paidTickets,
      freeTickets: freeTickets,
    };
  }, [wrappers]);

  return (
    <>
      <Grid container spacing={1} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
        <Grid item>
          <Typography component="div" variant="h6">
            Liste des représentations
          </Typography>
          <Typography component="div" variant="body2">
            Les valeurs associées aux tickets sont modifiables en double-cliquant dessus
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
                  <Typography sx={{ fontWeight: 600 }} data-sentry-mask>
                    {capitalizeFirstLetter(t('date.longWithTime', { date: eventsWrapper.event.startAt }))}
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
                                        eventCategoryTicketsId: otherWrapperSales.eventCategoryTickets.id,
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
          <Typography component="div" variant="h6">
            Chiffres clés du spectacle
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Box
            sx={{
              bgcolor: fr.colors.decisions.background.default.grey.default,
              borderRadius: '8px',
              py: { xs: 2, md: 3 },
              px: { xs: 1, md: 3 },
              mt: 1,
              mb: 3,
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Tooltip
                  title={
                    <>
                      Du {t('date.longWithTime', { date: eventSerie.startAt })} au{' '}
                      {t('date.longWithTime', {
                        date: eventSerie.endAt,
                      })}
                      <br />
                      <br />
                      Ces dates sont non modifiables car elles proviennent de votre système de billetterie
                    </>
                  }
                  data-sentry-mask
                >
                  <TextField
                    label="Date"
                    value={`${t('date.short', { date: eventSerie.startAt })}  →  ${t('date.short', {
                      date: eventSerie.endAt,
                    })}`}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip title={'Cette valeur est non modifiable car elle provient de votre système de billetterie'}>
                  <TextField
                    label="Nombre de représentations"
                    value={t('number.default', {
                      number: wrappers.length,
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip
                  title={
                    'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                  }
                >
                  <TextField
                    label="Recette de billetterie HT"
                    value={t('currency.amount', {
                      amount: getExcludingTaxesAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate),
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip
                  title={
                    'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                  }
                >
                  <TextField
                    label="Recette de billetterie TTC"
                    value={t('currency.amount', {
                      amount: totalIncludingTaxesAmount,
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip title={'Cette valeur est non modifiable car elle provient de votre système de billetterie'}>
                  <TextField
                    label="Taux de TVA"
                    value={t('number.percent', {
                      percentage: eventSerie.taxRate,
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip
                  title={
                    'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                  }
                >
                  <TextField
                    label="Montant de TVA"
                    value={t('currency.amount', {
                      amount: getTaxAmountFromIncludingTaxesAmount(totalIncludingTaxesAmount, eventSerie.taxRate),
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip
                  title={
                    'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                  }
                >
                  <TextField
                    label="Nombre d'entrées payantes"
                    value={t('number.default', {
                      number: paidTickets,
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip
                  title={
                    'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                  }
                >
                  <TextField
                    label="Nombre d'entrées gratuites"
                    value={t('number.default', {
                      number: freeTickets,
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip title={'Cette valeur est déduite des entrées payantes et gratuites'}>
                  <TextField
                    label="Nombre total d'entrées"
                    value={t('number.default', {
                      number: freeTickets + paidTickets,
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Tooltip
                  title={
                    'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                  }
                >
                  <TextField
                    label="Tarif moyen du billet TTC"
                    value={t('currency.amount', {
                      amount: averageTicketPrice,
                    })}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                      },
                      htmlInput: {
                        readOnly: true,
                      },
                    }}
                    variant="standard"
                    size="small"
                    fullWidth
                  />
                </Tooltip>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
