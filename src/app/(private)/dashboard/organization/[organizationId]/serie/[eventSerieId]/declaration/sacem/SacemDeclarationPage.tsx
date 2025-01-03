'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { zodResolver } from '@hookform/resolvers/zod';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { LoadingButton as Button } from '@mui/lab';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Chip, Link, TextField, Tooltip, Typography } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import NextLink from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventSalesTable } from '@ad/src/components/EventSalesTable';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { FillSacemDeclarationSchema, FillSacemDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { currencyFormatter, currencyFormatterWithNoDecimals } from '@ad/src/utils/currency';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export interface SacemDeclarationPageProps {
  params: { eventSerieId: string };
}

export function SacemDeclarationPage({ params: { eventSerieId } }: SacemDeclarationPageProps) {
  const { t } = useTranslation('common');

  const updateEventCategoryTickets = trpc.updateEventCategoryTickets.useMutation();
  const fillSacemDeclaration = trpc.fillSacemDeclaration.useMutation();

  const getEventSerie = trpc.getEventSerie.useQuery({
    id: eventSerieId,
  });

  const listEvents = trpc.listEvents.useQuery({
    orderBy: {},
    filterBy: {
      eventSeriesIds: [eventSerieId],
    },
  });

  const getSacemDeclaration = trpc.getSacemDeclaration.useQuery({
    eventSerieId: eventSerieId,
  });

  const aggregatedQueries = new AggregatedQueries(getEventSerie, listEvents, getSacemDeclaration);

  const [formInitialized, setFormInitialized] = useState<boolean>(false);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);
  const collapseAllAccordions = useCallback(() => setExpandedAccordions([]), []);
  const expandAllAccordions = useCallback(() => setExpandedAccordions(listEvents.data!.eventsWrappers.map((eW) => eW.event.id)), [listEvents.data]);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    control,
    reset,
  } = useForm<FillSacemDeclarationSchemaType>({
    resolver: zodResolver(FillSacemDeclarationSchema),
    defaultValues: {
      // ...prefill,
      eventSerieId: eventSerieId,
    }, // The rest will be set with data fetched
  });

  const onSubmit = useCallback(
    async (input: FillSacemDeclarationSchemaType) => {
      const result = await fillSacemDeclaration.mutateAsync(input);

      // Reset the form state so fields considered as "dirty" are no longer
      reset({
        eventSerieId: eventSerieId,
        clientId: result.sacemDeclaration.clientId,
        placeName: result.sacemDeclaration.placeName,
        placeCapacity: result.sacemDeclaration.placeCapacity,
        managerName: result.sacemDeclaration.managerName,
        managerTitle: result.sacemDeclaration.managerTitle,
      });
    },
    [fillSacemDeclaration, reset, eventSerieId]
  );

  useEffect(() => {
    if (!formInitialized && getSacemDeclaration.data?.sacemDeclarationWrapper.declaration) {
      setFormInitialized(true); // It's needed otherwise if you blur/focus again the window the new fetch data will override the "dirty form data"

      reset({
        eventSerieId: eventSerieId,
        clientId: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.clientId,
        placeName: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.placeName,
        placeCapacity: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.placeCapacity,
        managerName: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.managerName,
        managerTitle: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.managerTitle,
      }); // Update the form with fetched data
    }
  }, [getSacemDeclaration.data, formInitialized, setFormInitialized, reset, eventSerieId]);

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
  const sacemDeclarationWrapper = getSacemDeclaration.data!.sacemDeclarationWrapper;

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
          <Typography component="h2" variant="h6" data-sentry-mask>
            {eventSerie.name}
          </Typography>
        </Grid>
      </Container>
      {eventsWrappers.length > 0 ? (
        <>
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
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            '& > .MuiAccordionSummary-content': {
                              gap: 1,
                            },
                          }}
                        >
                          <Typography sx={{ fontWeight: 600 }} data-sentry-mask>
                            {capitalizeFirstLetter(t('date.longWithTime', { date: eventsWrapper.event.startAt }))}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto', pr: 2 }}>
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
                              label={`${currencyFormatterWithNoDecimals.format(
                                eventsWrapper.sales.reduce(
                                  (acc, sales) =>
                                    acc +
                                    (sales.eventCategoryTickets.totalOverride ?? sales.eventCategoryTickets.total) *
                                      (sales.eventCategoryTickets.priceOverride ?? sales.ticketCategory.price),
                                  0
                                )
                              )} TTC`}
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
                                  const otherEventsWrappersWithThisTicketCategory = eventsWrappers.filter((eW) => {
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
                                              {currencyFormatter.format(
                                                updatedRow.eventCategoryTickets.priceOverride ?? updatedRow.ticketCategory.price
                                              )}
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
                                                  otherWrapperSales.eventCategoryTickets.totalOverride !==
                                                  otherWrapperSales.eventCategoryTickets.total
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
              </Grid>
            </Container>
          </Container>
          <Container sx={{ pt: 2 }}>
            <BaseForm
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              control={control}
              ariaLabel="renseigner la déclaration"
              style={{ paddingTop: 20 }}
            >
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Informations sur la structure
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Tooltip
                      // TODO: should be editable from the account
                      title={'Cet intitulé a été configuré par notre équipe au moment de votre inscription'}
                    >
                      <TextField
                        disabled
                        label="Organisateur / Structure"
                        value={sacemDeclarationWrapper.declaration?.organizationName ?? sacemDeclarationWrapper.placeholder.organizationName}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="clientId"
                      defaultValue={control._defaultValues.clientId || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacemDeclarationWrapper.placeholder.clientId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="N° de client" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placeName"
                      defaultValue={control._defaultValues.placeName || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacemDeclarationWrapper.placeholder.placeName}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Nom de la salle" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placeCapacity"
                      defaultValue={control._defaultValues.placeCapacity}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            // [WORKAROUND] We had issue for `value` and some errors on changes when dealing with number
                            // So only using numbers for the underlying `TextField`
                            options={sacemDeclarationWrapper.placeholder.placeCapacity.map((capacity) => {
                              return capacity.toString(); // This is fine since dealing with integers, there is no dot/comma to format
                            })}
                            freeSolo
                            onBlur={onBlur}
                            value={value ? value.toString() : ''}
                            onInputChange={(event, newValue, reason) => {
                              const value = parseInt(newValue, 10);

                              onChange(value);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                type="number"
                                label="Jauge"
                                inputRef={ref}
                                inputProps={{
                                  // [WORKAROUND] We tried using the non-deprecated `slotProps.htmlInput.step` but it throws an error and
                                  //  `...params.slotProps.htmlInput` does not exist, so using the old way until fix
                                  // Old ref: https://github.com/mui/material-ui/issues/28687
                                  ...params.inputProps,
                                  step: 1, // Force the number to be an integer (not a float)
                                }}
                                onWheel={(event) => {
                                  // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

                                  // `event.currentTarget` is a callable type but is targetting the MUI element
                                  // whereas `event.target` targets the input element but does not have the callable type, so casting
                                  (event.target as HTMLInputElement).blur();
                                }}
                                error={!!error}
                                helperText={error?.message}
                                fullWidth
                              />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="managerName"
                      defaultValue={control._defaultValues.managerName || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacemDeclarationWrapper.placeholder.managerName}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Personne en charge"
                                inputRef={ref}
                                error={!!error}
                                helperText={error?.message}
                                fullWidth
                              />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="managerTitle"
                      defaultValue={control._defaultValues.managerTitle || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacemDeclarationWrapper.placeholder.managerTitle}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Qualité" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Informations sur le spectacle
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Tooltip title={'Cet intitulé est non modifiable car il provient de votre système de billetterie'}>
                      <TextField disabled label="Nom du spectacle" value={eventSerie.name} fullWidth />
                    </Tooltip>
                  </Grid>
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
                        disabled
                        label="Date"
                        value={`${t('date.long', { date: eventSerie.startAt })}  →  ${t('date.long', {
                          date: eventSerie.endAt,
                        })}`}
                        slotProps={{
                          htmlInput: {
                            readOnly: true,
                          },
                        }}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Tooltip title={'Cette valeur est non modifiable car elle provient de votre système de billetterie'}>
                      <TextField
                        disabled
                        label="Nombre de représentations"
                        value={sacemDeclarationWrapper.declaration?.eventsCount ?? sacemDeclarationWrapper.placeholder.eventsCount}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  {/* TODO: for now we do not know if it should be an enum for analytics */}
                  {/* <Grid item xs={12} sm={6}>
                    <TextField
                      label="Genre du spectacle"
                      value={sacemDeclaration.xxxx}
                      fullWidth
                    />
                  </Grid> */}
                </Grid>
              </Grid>
              <Grid item xs={12} sx={{ pb: 2 }}>
                <Typography gutterBottom variant="h6" component="div">
                  Recettes
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Tooltip
                      title={
                        'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                      }
                    >
                      <TextField
                        disabled
                        label="Nombre d'entrées payantes"
                        value={sacemDeclarationWrapper.declaration?.paidTickets ?? sacemDeclarationWrapper.placeholder.paidTickets}
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
                        disabled
                        label="Nombre d'entrées gratuites"
                        value={sacemDeclarationWrapper.declaration?.freeTickets ?? sacemDeclarationWrapper.placeholder.freeTickets}
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
                        disabled
                        label="Montant HT des recettes"
                        value={
                          sacemDeclarationWrapper.declaration
                            ? currencyFormatter.format(sacemDeclarationWrapper.declaration.excludingTaxesAmount)
                            : currencyFormatter.format(sacemDeclarationWrapper.placeholder.excludingTaxesAmount)
                        }
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
                        disabled
                        label="Montant de la TVA"
                        value={
                          sacemDeclarationWrapper.declaration
                            ? currencyFormatter.format(
                                sacemDeclarationWrapper.declaration.includingTaxesAmount - sacemDeclarationWrapper.declaration.excludingTaxesAmount
                              )
                            : currencyFormatter.format(
                                sacemDeclarationWrapper.placeholder.includingTaxesAmount - sacemDeclarationWrapper.placeholder.excludingTaxesAmount
                              )
                        }
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
                        disabled
                        label="Montant TTC des recettes"
                        value={
                          sacemDeclarationWrapper.declaration
                            ? currencyFormatter.format(sacemDeclarationWrapper.declaration.includingTaxesAmount)
                            : currencyFormatter.format(sacemDeclarationWrapper.placeholder.includingTaxesAmount)
                        }
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                item
                xs={12}
                sx={{
                  // If it has been filled once or the form has been mutated, make the area visible to not miss possible actions
                  position: sacemDeclarationWrapper.declaration || isDirty ? 'sticky' : 'relative',
                  bottom: 0,
                  bgcolor: fr.colors.decisions.background.default.grey.default,
                  zIndex: 450,
                  pt: 2,
                }}
              >
                <Grid container spacing={2} sx={{ alignItems: 'center', pb: 2 }}>
                  {isDirty || !sacemDeclarationWrapper.declaration ? (
                    <Grid item xs>
                      <Button
                        type="submit"
                        loading={fillSacemDeclaration.isLoading}
                        size="large"
                        variant="contained"
                        color="warning"
                        fullWidth
                        startIcon={<SaveIcon />}
                      >
                        Enregistrer les modifications en cours
                      </Button>
                    </Grid>
                  ) : (
                    <>
                      <Grid item xs>
                        <Button
                          // onClick={downloadPdf}
                          // loading={generatePdfFromDeclaration.isLoading}
                          size="large"
                          variant="contained"
                          fullWidth
                          startIcon={<DownloadIcon />}
                        >
                          Télécharger la déclaration
                        </Button>
                      </Grid>
                      <Grid item xs>
                        <Button
                          // onClick={downloadPdf}
                          // loading={generatePdfFromDeclaration.isLoading}
                          size="large"
                          variant="contained"
                          fullWidth
                          startIcon={<VisibilityIcon />}
                        >
                          Visualiser la déclaration
                        </Button>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="warning">
                  Notre service vous permet de générer la déclaration remplie mais n&apos;effectue pas de télétransmission.{' '}
                  <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'bold' }}>
                    Il vous incombe de transmettre le fichier PDF de cette déclaration à votre interlocuteur SACEM compétent. Et de vous assurer de
                    l&apos;exactitude des informations saisies.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  Si l&apos;interface ne répond pas à toutes les spécificités de votre déclaration, vous pouvez :
                  <ol>
                    <li>Contacter le support pour que nous sachions quoi améliorer ;</li>
                    <li>
                      Reporter manuellement les données sur le PDF fourni par la SACEM (
                      <Link
                        component={NextLink}
                        href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" // TODO: find the real PDF
                        target="_blank"
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
                    </li>
                  </ol>
                </Alert>
              </Grid>
            </BaseForm>
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
              Aucune date n&apos;a pu être récupérée pour cette série de représentations. Il n&apos;y a donc aucune déclaration à faire à la SACEM.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
