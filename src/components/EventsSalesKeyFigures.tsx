'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { ContentCopy } from '@mui/icons-material';
import { Alert, Box, Grid, IconButton, Snackbar, TextField, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ClipboardTicketingKeyFigures } from '@ad/src/components/ClipboardTicketingKeyFigures';
import { ClipboardTrigger } from '@ad/src/components/ClipboardTrigger';
import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';

export interface EventsSalesKeyFiguresProps {
  wrappers: EventWrapperSchemaType[];
  eventSerie: EventSerieSchemaType;
  roundValuesForCopy?: boolean; // Some organisms to declare are expected integers
  minimal?: boolean;
}

export function EventsSalesKeyFigures({ wrappers, eventSerie, roundValuesForCopy, minimal = false }: EventsSalesKeyFiguresProps) {
  const { t } = useTranslation('common');

  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [triggerKeyFiguresCopy, setTriggerKeyFiguresCopy] = useState(false);

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
      <Grid container spacing={2} justifyContent="center">
        {!minimal && (
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
        )}
        <Grid item xs={12}>
          <Grid
            container
            spacing={minimal ? 1 : 2}
            sx={
              minimal
                ? {
                    '.MuiInput-input': {
                      fontSize: '0.9rem',
                      pb: '0 !important',
                    },
                  }
                : {}
            }
          >
            {(!minimal || !mdUp) && (
              // On desktop it would display 3 columns for 10 items which takes "a lot of space" for the 4th row
              // We prefer moving the date elsewhere to have something more consistent
              <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
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
            )}
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
              <TextField
                label={minimal ? 'Représentations' : 'Nombre de représentations'}
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
              <TextField
                label={minimal ? 'Billetterie HT' : 'Recette de billetterie HT'}
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
              <TextField
                label={minimal ? 'Billetterie TTC' : 'Recette de billetterie TTC'}
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
              <TextField
                label={minimal ? 'Entrées payantes' : "Nombre d'entrées payantes"}
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
              <TextField
                label={minimal ? 'Entrées gratuites' : "Nombre d'entrées gratuites"}
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
              <TextField
                label={minimal ? "Total d'entrées" : "Nombre total d'entrées"}
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
            <Grid item xs={12} sm={6} md={minimal ? 4 : 6}>
              <TextField
                label={minimal ? 'Billet moyen TTC' : 'Tarif moyen du billet TTC'}
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
