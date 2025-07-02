'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Save, Visibility } from '@mui/icons-material';
import { Alert, Autocomplete, Box, Button, Container, Grid, Link, TextField, Tooltip, Typography } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { DeclarationHeader } from '@ad/src/components/DeclarationHeader';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { SacemExpensesTable } from '@ad/src/components/SacemExpensesTable';
import { SacemRevenuesTable } from '@ad/src/components/SacemRevenuesTable';
import { useConfirmationIfUnsavedChange } from '@ad/src/components/navigation/useConfirmationIfUnsavedChange';
import { FillSacemDeclarationSchema, FillSacemDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';
import { getBaseUrl } from '@ad/src/utils/url';

export const SacemDeclarationPageContext = createContext({
  ContextualDeclarationHeader: DeclarationHeader,
});

export interface SacemDeclarationPageProps {
  params: { organizationId: string; eventSerieId: string };
}

export function SacemDeclarationPage({ params: { organizationId, eventSerieId } }: SacemDeclarationPageProps) {
  const { t } = useTranslation('common');
  const { ContextualDeclarationHeader } = useContext(SacemDeclarationPageContext);

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

  const {
    handleSubmit,
    formState: { errors, isDirty },
    getValues,
    setValue,
    control,
    trigger,
    reset,
  } = useForm<FillSacemDeclarationSchemaType>({
    resolver: zodResolver(FillSacemDeclarationSchema),
    defaultValues: {
      // ...prefill,
      eventSerieId: eventSerieId,
    }, // The rest will be set with data fetched
  });

  // Due to the UI having tabs to switch between different declarations, we make sure the user is aware of loosing modifications
  useConfirmationIfUnsavedChange(isDirty);

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
        performanceType: result.sacemDeclaration.performanceType,
        declarationPlace: result.sacemDeclaration.declarationPlace,
        revenues: result.sacemDeclaration.revenues,
        expenses: result.sacemDeclaration.expenses,
      });

      push(['trackEvent', 'declaration', 'fill', 'type', DeclarationTypeSchema.Values.SACEM]);
    },
    [fillSacemDeclaration, reset, eventSerieId]
  );

  useEffect(() => {
    if (getSacemDeclaration.data) {
      if (!formInitialized) {
        setFormInitialized(true); // It's needed otherwise if you blur/focus again the window the new fetch data will override the "dirty form data"

        // Update the form with fetched data
        if (getSacemDeclaration.data.sacemDeclarationWrapper.declaration) {
          reset({
            eventSerieId: eventSerieId,
            clientId: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.clientId,
            placeName: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.placeName,
            placeCapacity: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.placeCapacity,
            managerName: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.managerName,
            managerTitle: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.managerTitle,
            performanceType: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.performanceType,
            declarationPlace: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.declarationPlace,
            revenues: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.revenues,
            expenses: getSacemDeclaration.data.sacemDeclarationWrapper.declaration.expenses,
          });
        } else if (getSacemDeclaration.data.sacemDeclarationWrapper.placeholder) {
          reset({
            eventSerieId: eventSerieId,
            revenues: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.revenues,
            expenses: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.expenses,
            // Taking the first placeholder since the backend sorted them by the last modification (likely to have the right data)
            clientId: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.clientId[0] ?? undefined,
            placeName: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.placeName[0] ?? undefined,
            placeCapacity: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.placeCapacity[0] ?? undefined,
            managerName: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.managerName[0] ?? undefined,
            managerTitle: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.managerTitle[0] ?? undefined,
            performanceType: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.performanceType[0] ?? undefined,
            declarationPlace: getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.declarationPlace[0] ?? undefined,
          });
        }
      } else {
        // Here it's a special case, we don't want to override the modified form except the ticketing revenues that are calculated and that result
        // from other entity modifications (we could have tried to separate first item from others revenues but it seemed not ideal)
        // Notes:
        // - it should always be the first item and filled so no check needed
        // - we tried to only mutate `revenues.à`
        setValue(
          'revenues',
          [
            getSacemDeclaration.data.sacemDeclarationWrapper.declaration
              ? getSacemDeclaration.data.sacemDeclarationWrapper.declaration.revenues[0]
              : getSacemDeclaration.data.sacemDeclarationWrapper.placeholder.revenues[0],
            ...getValues('revenues').slice(1),
          ],
          { shouldValidate: true }
        );
      }
    }
  }, [getSacemDeclaration.data, formInitialized, setFormInitialized, reset, eventSerieId, getValues, setValue]);

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
  const sacemDeclarationWrapper = getSacemDeclaration.data!.sacemDeclarationWrapper;

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
            currentDeclaration="sacem"
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
                    p: 3,
                  }}
                >
                  <Typography variant="body1">
                    <Typography component="span" sx={{ fontWeight: 600 }}>
                      Le formulaire ci-dessous vous permet de générer un PDF à transmettre à la SACEM.
                    </Typography>{' '}
                    <Typography component="span" sx={{ fontStyle: 'italic' }}>
                      Si vous préférez, il est aussi possible de reporter manuellement les données sur le PDF fourni par la SACEM (
                      <Link
                        component={NextLink}
                        href={`${getBaseUrl()}/assets/templates/declaration/sacem.pdf`}
                        target="_blank"
                        onClick={() => {
                          push(['trackEvent', 'declaration', 'downloadTemplate', 'type', DeclarationTypeSchema.Values.SACEM]);
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
                  </Typography>
                </Box>
              </Grid>
            </Grid>
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
                  Structure
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
                  Spectacle
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
                        value={t('number.default', {
                          number: sacemDeclarationWrapper.declaration?.eventsCount ?? sacemDeclarationWrapper.placeholder.eventsCount,
                        })}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="performanceType"
                      defaultValue={control._defaultValues.performanceType || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacemDeclarationWrapper.placeholder.performanceType}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Genre du spectacle"
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
                        value={t('number.default', {
                          number: sacemDeclarationWrapper.declaration?.paidTickets ?? sacemDeclarationWrapper.placeholder.paidTickets,
                        })}
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
                        value={t('number.default', {
                          number: sacemDeclarationWrapper.declaration?.freeTickets ?? sacemDeclarationWrapper.placeholder.freeTickets,
                        })}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <SacemRevenuesTable control={control} trigger={trigger} errors={errors.revenues} />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Dépenses artistiques
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <SacemExpensesTable control={control} trigger={trigger} errors={errors.expenses} />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ mt: 2, pb: 2 }}>
                <Controller
                  control={control}
                  name="declarationPlace"
                  defaultValue={control._defaultValues.declarationPlace || ''}
                  render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                    return (
                      <Autocomplete
                        options={sacemDeclarationWrapper.placeholder.declarationPlace}
                        freeSolo
                        onBlur={onBlur}
                        value={value}
                        onInputChange={(event, newValue, reason) => {
                          onChange(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Lieu de déclaration" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
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
                    <Grid item xs={12} sm={8} md={6} sx={{ mx: 'auto' }}>
                      <Button
                        type="submit"
                        loading={fillSacemDeclaration.isPending}
                        size="large"
                        variant="contained"
                        color="warning"
                        fullWidth
                        startIcon={<Save />}
                      >
                        Enregistrer les modifications en cours
                      </Button>
                    </Grid>
                  ) : (
                    <>
                      <Grid item xs={12} sm={8} md={6} sx={{ mx: 'auto' }}>
                        <Button
                          component={NextLink}
                          href={linkRegistry.get('declarationPdf', {
                            eventSerieId: eventSerie.id,
                            type: DeclarationTypeSchema.Values.SACEM,
                            download: true,
                          })}
                          download // Not forcing the download so using an explicit query parameter to force headers from the server
                          target="_blank" // Needed otherwise after the first click it won't work again (probably due to this page receiving headers already)
                          onClick={() => {
                            push(['trackEvent', 'declaration', 'download', 'type', DeclarationTypeSchema.Values.SACEM]);
                          }}
                          size="large"
                          variant="contained"
                          fullWidth
                          startIcon={<Download />}
                          sx={{
                            '&::after': {
                              display: 'none !important',
                            },
                          }}
                        >
                          Générer la déclaration
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
              Aucune date n&apos;a pu être récupérée pour ce spectacle. Il n&apos;y a donc aucune déclaration à faire à la SACEM.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
