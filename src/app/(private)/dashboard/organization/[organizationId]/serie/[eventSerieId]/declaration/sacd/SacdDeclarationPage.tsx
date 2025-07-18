'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Download, ForwardToInbox, Save } from '@mui/icons-material';
import { Autocomplete, Button, Container, Grid, TextField, Tooltip, Typography } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { SacdDeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacd/SacdDeclarationPageContext';
import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { SacdAccountingEntriesTable } from '@ad/src/components/SacdAccountingEntriesTable';
import { SacdOrganizationFields } from '@ad/src/components/SacdOrganizationFields';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { useConfirmationIfUnsavedChange } from '@ad/src/components/navigation/useConfirmationIfUnsavedChange';
import { FillSacdDeclarationSchema, FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export interface SacdDeclarationPageProps {
  params: { organizationId: string; eventSerieId: string };
}

export function SacdDeclarationPage({ params: { organizationId, eventSerieId } }: SacdDeclarationPageProps) {
  const { t } = useTranslation('common');
  const { ContextualDeclarationHeader } = useContext(SacdDeclarationPageContext);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const fillSacdDeclaration = trpc.fillSacdDeclaration.useMutation();
  const transmitDeclaration = trpc.transmitDeclaration.useMutation();

  const getEventSerie = trpc.getEventSerie.useQuery({
    id: eventSerieId,
  });

  const listEvents = trpc.listEvents.useQuery({
    orderBy: {},
    filterBy: {
      eventSeriesIds: [eventSerieId],
    },
  });

  const getSacdDeclaration = trpc.getSacdDeclaration.useQuery({
    eventSerieId: eventSerieId,
  });

  const aggregatedQueries = new AggregatedQueries(getEventSerie, listEvents, getSacdDeclaration);

  const [formInitialized, setFormInitialized] = useState<boolean>(false);

  const {
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    control,
    trigger,
    reset,
  } = useForm<FillSacdDeclarationSchemaType>({
    resolver: zodResolver(FillSacdDeclarationSchema),
    defaultValues: {
      // ...prefill,
      eventSerieId: eventSerieId,
    }, // The rest will be set with data fetched
  });

  // Due to the UI having tabs to switch between different declarations, we make sure the user is aware of loosing modifications
  useConfirmationIfUnsavedChange(isDirty);

  const onSubmit = useCallback(
    async (input: FillSacdDeclarationSchemaType) => {
      const result = await fillSacdDeclaration.mutateAsync(input);

      // To not have the "id" key
      const { id: id1, ...producerAddress } = result.sacdDeclaration.producer.headquartersAddress;

      const producer = {
        ...result.sacdDeclaration.producer,
        headquartersAddress: producerAddress,
      };

      // Reset the form state so fields considered as "dirty" are no longer
      reset({
        eventSerieId: eventSerieId,
        clientId: result.sacdDeclaration.clientId,
        placeName: result.sacdDeclaration.placeName,
        placeStreet: result.sacdDeclaration.placeStreet,
        placePostalCode: result.sacdDeclaration.placePostalCode,
        placeCity: result.sacdDeclaration.placeCity,
        accountingEntries: result.sacdDeclaration.accountingEntries,
        producer: producer,
      });

      push(['trackEvent', 'declaration', 'fill', 'type', DeclarationTypeSchema.Values.SACD]);
    },
    [fillSacdDeclaration, reset, eventSerieId]
  );

  useEffect(() => {
    if (!formInitialized && getSacdDeclaration.data) {
      setFormInitialized(true); // It's needed otherwise if you blur/focus again the window the new fetch data will override the "dirty form data"

      // Update the form with fetched data
      if (getSacdDeclaration.data.sacdDeclarationWrapper.declaration) {
        // To not have the "id" key
        const { id: id1, ...producerAddress } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer.headquartersAddress;

        const producer = {
          ...getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer,
          headquartersAddress: producerAddress,
        };

        reset({
          eventSerieId: eventSerieId,
          clientId: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.clientId,
          placeName: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeName,
          placeStreet: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeStreet,
          placePostalCode: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placePostalCode,
          placeCity: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeCity,
          accountingEntries: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.accountingEntries,
          producer: producer,
        });
      } else if (getSacdDeclaration.data.sacdDeclarationWrapper.placeholder) {
        reset({
          eventSerieId: eventSerieId,
          accountingEntries: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.accountingEntries,
          // Taking the first placeholder since the backend sorted them by the last modification (likely to have the right data)
          clientId: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.clientId[0] ?? undefined,
          placeName: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placeName[0] ?? undefined,
          placeStreet: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placeStreet[0] ?? undefined,
          placePostalCode: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placePostalCode[0] ?? undefined,
          placeCity: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placeCity[0] ?? undefined,
        });
      }
    }
  }, [getSacdDeclaration.data, formInitialized, setFormInitialized, reset, eventSerieId]);

  const { transmittedDeclarations } = useMemo(() => {
    return {
      transmittedDeclarations: getEventSerie.data?.partialDeclarations.filter((pD) => pD.transmittedAt !== null).map((pD) => pD.type) ?? [],
    };
  }, [getEventSerie]);

  const { alreadyDeclared } = useMemo(() => {
    return {
      alreadyDeclared: (getSacdDeclaration.data?.sacdDeclarationWrapper.declaration?.transmittedAt || null) !== null,
    };
  }, [getSacdDeclaration]);

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
  const sacdDeclarationWrapper = getSacdDeclaration.data!.sacdDeclarationWrapper;

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
            currentDeclaration="sacd"
            transmittedDeclarations={transmittedDeclarations}
            readonly={alreadyDeclared}
          />
        </Container>
      </Container>
      {eventsWrappers.length > 0 ? (
        <>
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
                  Diffuseur
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Tooltip
                      // TODO: should be editable from the account
                      title={alreadyDeclared ? '' : 'Cet intitulé a été configuré par notre équipe au moment de votre inscription'}
                    >
                      <TextField
                        disabled
                        label="Raison sociale de la structure"
                        value={sacdDeclarationWrapper.declaration?.organizationName ?? sacdDeclarationWrapper.placeholder.organizationName}
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
                            disabled={alreadyDeclared}
                            options={sacdDeclarationWrapper.placeholder.clientId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="N° identifiant SACD"
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
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Lieu de représentation
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placeName"
                      defaultValue={control._defaultValues.placeName || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            options={sacdDeclarationWrapper.placeholder.placeName}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => {
                              return (
                                <TextField
                                  {...params}
                                  label="Intitulé (de la salle ou du lieu)"
                                  inputRef={ref}
                                  error={!!error}
                                  helperText={error?.message}
                                  fullWidth
                                />
                              );
                            }}
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
                      name="placeStreet"
                      defaultValue={control._defaultValues.placeStreet || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            options={sacdDeclarationWrapper.placeholder.placeStreet}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => {
                              return <TextField {...params} label="Adresse" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />;
                            }}
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
                      name="placePostalCode"
                      defaultValue={control._defaultValues.placePostalCode || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            options={sacdDeclarationWrapper.placeholder.placePostalCode}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Code postal" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
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
                      name="placeCity"
                      defaultValue={control._defaultValues.placeCity || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            options={sacdDeclarationWrapper.placeholder.placeCity}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Ville" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
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
                  Prix de cession du droit d&apos;exploitation du spectacle
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <SacdAccountingEntriesTable control={control} trigger={trigger} errors={errors.accountingEntries} readonly={alreadyDeclared} />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sx={{ pb: 2 }}>
                <Typography gutterBottom variant="h6" component="div">
                  Producteur
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <SacdOrganizationFields
                    control={control}
                    organizationType="producer"
                    placeholder={sacdDeclarationWrapper.placeholder.producer}
                    errors={errors.producer}
                    readonly={alreadyDeclared}
                  />
                </Grid>
              </Grid>
              <Grid
                item
                xs={12}
                sx={{
                  // If it has been filled once or the form has been mutated, make the area visible to not miss possible actions
                  position: sacdDeclarationWrapper.declaration || isDirty ? 'sticky' : 'relative',
                  bottom: 0,
                  bgcolor: fr.colors.decisions.background.default.grey.default,
                  zIndex: 450,
                  pt: 2,
                }}
              >
                <Grid container spacing={2} sx={{ alignItems: 'center', pb: 2 }}>
                  {isDirty || !sacdDeclarationWrapper.declaration ? (
                    <Grid item xs={12} sm={8} md={6} sx={{ mx: 'auto' }}>
                      <Button
                        type="submit"
                        loading={fillSacdDeclaration.isPending}
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
                      <Grid item xs>
                        <Button
                          component={NextLink}
                          href={linkRegistry.get('declarationPdf', {
                            eventSerieId: eventSerie.id,
                            type: DeclarationTypeSchema.Values.SACD,
                            download: true,
                          })}
                          download // Not forcing the download so using an explicit query parameter to force headers from the server
                          target="_blank" // Needed otherwise after the first click it won't work again (probably due to this page receiving headers already)
                          onClick={() => {
                            push(['trackEvent', 'declaration', 'download', 'type', DeclarationTypeSchema.Values.SACD]);
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
                          Télécharger la déclaration
                        </Button>
                      </Grid>
                      <Grid item xs>
                        {process.env.NEXT_PUBLIC_APP_MODE === 'prod' && process.env.NEXT_PUBLIC_FEATURE_FLAG_SACD === 'disabled' ? (
                          <Button disabled={true} size="large" variant="contained" fullWidth startIcon={<ForwardToInbox />}>
                            Télédéclarer&nbsp;
                            <Typography component="span" sx={{ fontStyle: 'italic' }}>
                              (bientôt disponible)
                            </Typography>
                          </Button>
                        ) : (
                          <>
                            {alreadyDeclared ? (
                              <Button disabled={true} size="large" variant="contained" fullWidth startIcon={<CheckCircle />}>
                                Télédéclaration le {t('date.shortWithTime', { date: sacdDeclarationWrapper.declaration!.transmittedAt })}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => {
                                  showConfirmationDialog({
                                    description: (
                                      <>
                                        Êtes-vous sûr de vouloir transmettre ces informations à la SACD pour le spectacle{' '}
                                        <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                          {eventSerie.name}
                                        </Typography>{' '}
                                        ?
                                        <br />
                                        <br />
                                        <Typography component="span" variant="body2" sx={{ fontStyle: 'italic' }}>
                                          Après envoi, aucune modification ne pourra être opérée depuis notre interface. Pour toute correction ou
                                          amendement de la déclaration, il faudra directement contacter votre interlocuteur SACD.
                                        </Typography>
                                      </>
                                    ),
                                    onConfirm: async () => {
                                      const result = await transmitDeclaration.mutateAsync({
                                        eventSerieId: eventSerieId,
                                        type: DeclarationTypeSchema.Values.SACD,
                                      });

                                      push(['trackEvent', 'declaration', 'transmit', 'type', DeclarationTypeSchema.Values.SACD]);
                                    },
                                  });
                                }}
                                size="large"
                                variant="contained"
                                fullWidth
                                startIcon={<ForwardToInbox />}
                              >
                                Télédéclarer
                              </Button>
                            )}
                          </>
                        )}
                      </Grid>
                    </>
                  )}
                </Grid>
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
              Aucune date n&apos;a pu être récupérée pour ce spectacle. Il n&apos;y a donc aucune déclaration à faire à la SACD.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
