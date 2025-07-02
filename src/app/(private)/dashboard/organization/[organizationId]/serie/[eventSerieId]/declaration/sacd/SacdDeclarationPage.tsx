'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Download, ForwardToInbox, Save } from '@mui/icons-material';
import {
  Autocomplete,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import diff from 'microdiff';
import NextLink from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { DeclarationHeader } from '@ad/src/components/DeclarationHeader';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { SacdAccountingEntriesTable } from '@ad/src/components/SacdAccountingEntriesTable';
import { SacdOrganizationFields } from '@ad/src/components/SacdOrganizationFields';
import { SacdPerformedWorksTable } from '@ad/src/components/SacdPerformedWorksTable';
import { SacdTicketingEntriesTable } from '@ad/src/components/SacdTicketingEntriesTable';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { useConfirmationIfUnsavedChange } from '@ad/src/components/navigation/useConfirmationIfUnsavedChange';
import { sacdOrganizationPlaceholderToOrganizationInput } from '@ad/src/core/declaration';
import { FillSacdDeclarationSchema, FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { SacdAudienceSchema, SacdProductionTypeSchema } from '@ad/src/models/entities/declaration/sacd';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export const SacdDeclarationPageContext = createContext({
  ContextualDeclarationHeader: DeclarationHeader,
});

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
  const [producerSameThanOrganizer, setProducerSameThanOrganizer] = useState<boolean | null>(null);
  const [rightsFeesManagerSameThan, setRightsFeesManagerSameThan] = useState<'organizer' | 'producer' | 'none' | null>(null);

  const {
    handleSubmit,
    formState: { errors, isDirty },
    getValues,
    setValue,
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

  const preHandleSubmit: typeof handleSubmit = useCallback(
    (onValid, onInvalid) => {
      // Before validating locally the fields we make sure to apply the mirors if any
      if (producerSameThanOrganizer) {
        setValue('producer', getValues('organizer'), { shouldValidate: true });
      }

      if (rightsFeesManagerSameThan === 'organizer') {
        setValue('rightsFeesManager', getValues('organizer'), { shouldValidate: true });
      } else if (rightsFeesManagerSameThan === 'producer') {
        setValue('rightsFeesManager', getValues('producer'), { shouldValidate: true });
      }

      return handleSubmit(onValid, onInvalid);
    },
    [handleSubmit, getValues, setValue, producerSameThanOrganizer, rightsFeesManagerSameThan]
  );

  const onSubmit = useCallback(
    async (input: FillSacdDeclarationSchemaType) => {
      const result = await fillSacdDeclaration.mutateAsync(input);

      // To not have the "id" key
      const { id: id1, ...organizerPhone } = result.sacdDeclaration.organizer.phone;
      const { id: id2, ...organizerAddress } = result.sacdDeclaration.organizer.headquartersAddress;
      const { id: id3, ...producerPhone } = result.sacdDeclaration.producer.phone;
      const { id: id4, ...producerAddress } = result.sacdDeclaration.producer.headquartersAddress;
      const { id: id5, ...rightsFeesManagerPhone } = result.sacdDeclaration.rightsFeesManager.phone;
      const { id: id6, ...rightsFeesManagerAddress } = result.sacdDeclaration.rightsFeesManager.headquartersAddress;

      const organizer = {
        ...result.sacdDeclaration.organizer,
        phone: organizerPhone,
        headquartersAddress: organizerAddress,
      };
      const producer = {
        ...result.sacdDeclaration.producer,
        phone: producerPhone,
        headquartersAddress: producerAddress,
      };
      const rightsFeesManager = {
        ...result.sacdDeclaration.rightsFeesManager,
        phone: rightsFeesManagerPhone,
        headquartersAddress: rightsFeesManagerAddress,
      };

      // Reset the form state so fields considered as "dirty" are no longer
      reset({
        eventSerieId: eventSerieId,
        clientId: result.sacdDeclaration.clientId,
        officialHeadquartersId: result.sacdDeclaration.officialHeadquartersId,
        productionOperationId: result.sacdDeclaration.productionOperationId,
        productionType: result.sacdDeclaration.productionType,
        placeName: result.sacdDeclaration.placeName,
        placePostalCode: result.sacdDeclaration.placePostalCode,
        placeCity: result.sacdDeclaration.placeCity,
        audience: result.sacdDeclaration.audience,
        placeCapacity: result.sacdDeclaration.placeCapacity,
        accountingEntries: result.sacdDeclaration.accountingEntries,
        organizer: organizer,
        producer: producer,
        rightsFeesManager: rightsFeesManager,
        performedWorks: result.sacdDeclaration.performedWorks,
        declarationPlace: result.sacdDeclaration.declarationPlace,
      });

      // Just in case readjust booleans if something has changed by another tab
      const organizerProducerDiff = diff(result.sacdDeclaration.organizer, result.sacdDeclaration.producer);
      const producerRightsFeesManagerDiff = diff(result.sacdDeclaration.producer, result.sacdDeclaration.rightsFeesManager);
      const organizerRightsFeesManagerDiff = diff(result.sacdDeclaration.organizer, result.sacdDeclaration.rightsFeesManager);

      setProducerSameThanOrganizer(organizerProducerDiff.length === 0);
      setRightsFeesManagerSameThan(
        // Here by default we set "organizer" if "producer" is also the same
        organizerRightsFeesManagerDiff.length === 0 ? 'organizer' : producerRightsFeesManagerDiff.length === 0 ? 'producer' : 'none'
      );

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
        const { id: id1, ...organizerPhone } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer.phone;
        const { id: id2, ...organizerAddress } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer.headquartersAddress;
        const { id: id3, ...producerPhone } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer.phone;
        const { id: id4, ...producerAddress } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer.headquartersAddress;
        const { id: id5, ...rightsFeesManagerPhone } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager.phone;
        const { id: id6, ...rightsFeesManagerAddress } =
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager.headquartersAddress;

        const organizer = {
          ...getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer,
          phone: organizerPhone,
          headquartersAddress: organizerAddress,
        };
        const producer = {
          ...getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer,
          phone: producerPhone,
          headquartersAddress: producerAddress,
        };
        const rightsFeesManager = {
          ...getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager,
          phone: rightsFeesManagerPhone,
          headquartersAddress: rightsFeesManagerAddress,
        };

        reset({
          eventSerieId: eventSerieId,
          clientId: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.clientId,
          officialHeadquartersId: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.officialHeadquartersId,
          productionOperationId: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.productionOperationId,
          productionType: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.productionType,
          placeName: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeName,
          placePostalCode: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placePostalCode,
          placeCity: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeCity,
          audience: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.audience,
          placeCapacity: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeCapacity,
          accountingEntries: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.accountingEntries,
          organizer: organizer,
          producer: producer,
          rightsFeesManager: rightsFeesManager,
          performedWorks: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.performedWorks,
          declarationPlace: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.declarationPlace,
        });

        // Init the UI correctly
        const organizerProducerDiff = diff(
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer,
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer
        );
        const producerRightsFeesManagerDiff = diff(
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer,
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager
        );
        const organizerRightsFeesManagerDiff = diff(
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer,
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager
        );

        setProducerSameThanOrganizer(organizerProducerDiff.length === 0);
        setRightsFeesManagerSameThan(
          // Here by default we set "organizer" if "producer" is also the same
          organizerRightsFeesManagerDiff.length === 0 ? 'organizer' : producerRightsFeesManagerDiff.length === 0 ? 'producer' : 'none'
        );
      } else if (getSacdDeclaration.data.sacdDeclarationWrapper.placeholder) {
        reset({
          eventSerieId: eventSerieId,
          accountingEntries: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.accountingEntries,
          performedWorks: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.performedWorks,
          // Taking the first placeholder since the backend sorted them by the last modification (likely to have the right data)
          clientId: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.clientId[0] ?? undefined,
          officialHeadquartersId: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.officialHeadquartersId[0] ?? undefined,
          productionType: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.productionType,
          placeName: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placeName[0] ?? undefined,
          placePostalCode: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placePostalCode[0] ?? undefined,
          placeCity: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placeCity[0] ?? undefined,
          audience: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.audience,
          placeCapacity: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.placeCapacity[0] ?? undefined,
          declarationPlace: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.declarationPlace[0] ?? undefined,
          // Here we just manage the organizer since the producer and the rights fees manager are unlikely to be the same across events series
          organizer: sacdOrganizationPlaceholderToOrganizationInput(getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.organizer),
          // The following is needed otherwise `isDirty` is true due to comparing undefined to the default empty string from the `TextField`
          // Note: if the form was too complex we could have use a virtual `isDirty` based on `dirtyFields` (that is empty in this specific case) (ref: https://github.com/react-hook-form/react-hook-form/issues/4740)
          productionOperationId: '',
        });

        // Make sure to have the right radio states
        setProducerSameThanOrganizer(null);
        setRightsFeesManagerSameThan(null);
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
              handleSubmit={preHandleSubmit}
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
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="officialHeadquartersId"
                      defaultValue={control._defaultValues.officialHeadquartersId || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            options={sacdDeclarationWrapper.placeholder.officialHeadquartersId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="N° Siret" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
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
                  Votre spectacle
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="productionOperationId"
                      defaultValue={control._defaultValues.productionOperationId || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            options={sacdDeclarationWrapper.placeholder.productionOperationId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Dossier d'exploitation"
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
                      name="productionType"
                      defaultValue={'' as any} // Needed to have a controlled input
                      render={({ field: field, fieldState: { error }, formState }) => {
                        return (
                          <TextField
                            select
                            {...field}
                            disabled={alreadyDeclared}
                            label="Nature de l'exploitation"
                            error={!!error}
                            helperText={error?.message}
                            margin="dense"
                            fullWidth
                            sx={{ m: 0 }}
                          >
                            {Object.values(SacdProductionTypeSchema.Values).map((productionType) => (
                              <MenuItem key={productionType} value={productionType}>
                                {t(`model.sacdDeclaration.productionType.enum.${productionType}`)}
                              </MenuItem>
                            ))}
                          </TextField>
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Tooltip title={alreadyDeclared ? '' : 'Cet intitulé est non modifiable car il provient de votre système de billetterie'}>
                      <TextField disabled label="Titre du spectacle" value={eventSerie.name} fullWidth />
                    </Tooltip>
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
                              return <TextField {...params} label="Salle" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />;
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
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Déclaration de la billetterie
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="audience"
                      defaultValue={'' as any} // Needed to have a controlled input
                      render={({ field: field, fieldState: { error }, formState }) => {
                        return (
                          <TextField
                            select
                            {...field}
                            disabled={alreadyDeclared}
                            label="Nature des représentations"
                            error={!!error}
                            helperText={error?.message}
                            margin="dense"
                            fullWidth
                            sx={{ m: 0 }}
                          >
                            {Object.values(SacdAudienceSchema.Values).map((audience) => (
                              <MenuItem key={audience} value={audience}>
                                {t(`model.sacdDeclaration.audience.enum.${audience}`)}
                              </MenuItem>
                            ))}
                          </TextField>
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 1, mb: 2 }}>
                    <SacdTicketingEntriesTable wrappers={eventsWrappers} audience={watch('audience')} taxRate={eventSerie.taxRate} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Tooltip
                      title={
                        alreadyDeclared
                          ? ''
                          : 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                      }
                    >
                      <TextField
                        disabled
                        label="Tarif moyen du billet affiché pour le spectacle"
                        value={t('currency.amount', {
                          amount: sacdDeclarationWrapper.declaration?.averageTicketPrice ?? sacdDeclarationWrapper.placeholder.averageTicketPrice,
                        })}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placeCapacity"
                      defaultValue={control._defaultValues.placeCapacity}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            // [WORKAROUND] We had issue for `value` and some errors on changes when dealing with number
                            // So only using numbers for the underlying `TextField`
                            options={sacdDeclarationWrapper.placeholder.placeCapacity.map((capacity) => {
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
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Organisateur ou diffuseur
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <SacdOrganizationFields
                    control={control}
                    organizationType="organizer"
                    placeholder={sacdDeclarationWrapper.placeholder.organizer}
                    errors={errors.organizer}
                    readonly={alreadyDeclared}
                  />
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Producteur ou tourneur
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl
                      disabled={alreadyDeclared}
                      error={
                        (producerSameThanOrganizer === null && !!errors?.producer?.message) ||
                        (producerSameThanOrganizer === true && !!errors?.organizer)
                      }
                    >
                      <FormLabel id="producer-choice-radio-buttons-group-label">
                        Est-ce le même organisme que l&apos;organisateur/diffuseur ?
                      </FormLabel>
                      <RadioGroup
                        row
                        value={producerSameThanOrganizer}
                        onChange={(event) => {
                          const value = event.target.value === 'true';

                          setProducerSameThanOrganizer(value);
                        }}
                        aria-labelledby="producer-choice-radio-buttons-group-label"
                        aria-describedby="producer-choice-helper-text"
                      >
                        <FormControlLabel value="true" control={<Radio />} label="Oui" />
                        <FormControlLabel value="false" control={<Radio />} label="Non" />
                      </RadioGroup>
                      <FormHelperText id="producer-choice-helper-text">
                        {producerSameThanOrganizer === null && errors?.producer?.message}
                        {producerSameThanOrganizer === true && errors?.organizer && `Veuillez corriger les champs pour l'organisateur/diffuseur`}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  {producerSameThanOrganizer === false && (
                    <SacdOrganizationFields
                      control={control}
                      organizationType="producer"
                      placeholder={sacdDeclarationWrapper.placeholder.producer}
                      errors={errors.producer}
                      readonly={alreadyDeclared}
                    />
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Organisme responsable du paiement des droits
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl
                      disabled={alreadyDeclared}
                      error={
                        (rightsFeesManagerSameThan === null && !!errors?.rightsFeesManager?.message) ||
                        (rightsFeesManagerSameThan === 'organizer' && !!errors?.organizer) ||
                        (rightsFeesManagerSameThan === 'producer' && !!errors?.producer)
                      }
                    >
                      <FormLabel id="rights-fees-manager-choice-radio-buttons-group-label">Quel organisme ?</FormLabel>
                      <RadioGroup
                        row
                        value={rightsFeesManagerSameThan}
                        onChange={(event) => {
                          setRightsFeesManagerSameThan(event.target.value as 'none' | 'organizer' | 'producer');
                        }}
                        aria-labelledby="rights-fees-manager-choice-radio-buttons-group-label"
                        aria-describedby="rights-fees-manager-choice-helper-text"
                      >
                        <FormControlLabel value="organizer" control={<Radio />} label="Organisateur/diffuseur" />
                        <FormControlLabel value="producer" control={<Radio />} label="Producteur/tourneur" />
                        <FormControlLabel value="none" control={<Radio />} label="Un autre" />
                      </RadioGroup>
                      <FormHelperText id="rights-fees-manager-choice-helper-text">
                        {rightsFeesManagerSameThan === null && errors?.rightsFeesManager?.message}
                        {rightsFeesManagerSameThan === 'organizer' &&
                          errors?.organizer &&
                          `Veuillez corriger les champs pour l'organisateur/diffuseur`}
                        {rightsFeesManagerSameThan === 'producer' && errors?.producer && `Veuillez corriger les champs pour le producteur/tourneur`}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  {rightsFeesManagerSameThan === 'none' && (
                    <SacdOrganizationFields
                      control={control}
                      organizationType="rightsFeesManager"
                      placeholder={sacdDeclarationWrapper.placeholder.rightsFeesManager}
                      errors={errors.rightsFeesManager}
                      readonly={alreadyDeclared}
                    />
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Œuvre(s) représentée(s)
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <SacdPerformedWorksTable
                      control={control}
                      trigger={trigger}
                      placeholder={sacdDeclarationWrapper.placeholder.performedWorksOptions}
                      errors={errors.performedWorks}
                      readonly={alreadyDeclared}
                    />
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
                        disabled={alreadyDeclared}
                        options={sacdDeclarationWrapper.placeholder.declarationPlace}
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
                        {alreadyDeclared ? (
                          <Button disabled={true} size="large" variant="contained" fullWidth startIcon={<CheckCircle />}>
                            Télédéclaration le {t('date.shortWithTime', { date: sacdDeclarationWrapper.declaration.transmittedAt })}
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
