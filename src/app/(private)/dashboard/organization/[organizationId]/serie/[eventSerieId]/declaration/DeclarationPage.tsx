'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/SelectNext';
import addressFormatter from '@fragaria/address-formatter';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Download, ForwardToInbox, Save } from '@mui/icons-material';
import { Alert, Autocomplete, Button, Container, Grid, TextField, Tooltip, Typography } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { Ref, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { DeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPageContext';
import { trpc } from '@ad/src/client/trpcClient';
import { useAmountInput } from '@ad/src/components/AmountInput';
import { BaseForm } from '@ad/src/components/BaseForm';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { officialHeadquartersIdMask } from '@ad/src/components/OfficialHeadquartersIdField';
import { useSacdIdInput } from '@ad/src/components/SacdIdField';
import { useSacemIdInput } from '@ad/src/components/SacemIdField';
// import { SacemExpensesTable } from '@ad/src/components/SacemExpensesTable';
// import { SacemRevenuesTable } from '@ad/src/components/SacemRevenuesTable';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { useConfirmationIfUnsavedChange } from '@ad/src/components/navigation/useConfirmationIfUnsavedChange';
import { currentTaxRates } from '@ad/src/core/declaration';
import { getEventsKeyFigures } from '@ad/src/core/declaration/format';
import { FillDeclarationSchema, FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { AudienceSchema, PerformanceTypeSchema } from '@ad/src/models/entities/event';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { formatMaskedValue } from '@ad/src/utils/imask';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export interface DeclarationPageProps {
  params: { organizationId: string; eventSerieId: string };
}

export function DeclarationPage({ params: { organizationId, eventSerieId } }: DeclarationPageProps) {
  const { t } = useTranslation('common');
  const { ContextualDeclarationHeader } = useContext(DeclarationPageContext);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const fillDeclaration = trpc.fillDeclaration.useMutation();
  const transmitDeclaration = trpc.transmitDeclaration.useMutation();

  const getDeclaration = trpc.getDeclaration.useQuery({
    eventSerieId: eventSerieId,
  });

  const aggregatedQueries = new AggregatedQueries(getDeclaration);

  const [modalSelectedDeclarationTypes, setModalSelectedDeclarationTypes] = useState<DeclarationTypeSchemaType[]>([]);
  const [formInitialized, setFormInitialized] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    getValues,
    setValue,
    control,
    watch,
    trigger,
    reset,
  } = useForm<FillDeclarationSchemaType>({
    resolver: zodResolver(FillDeclarationSchema),
    defaultValues: {
      // ...prefill,
      eventSerieId: eventSerieId,
    }, // The rest will be set with data fetched
  });

  // Due to the UI having tabs to switch between different declarations, we make sure the user is aware of loosing modifications
  useConfirmationIfUnsavedChange(isDirty);

  const onSubmit = useCallback(
    async (input: FillDeclarationSchemaType) => {
      const result = await fillDeclaration.mutateAsync(input);

      // Reset the form state so fields considered as "dirty" are no longer
      reset({
        eventSerieId: eventSerieId,
        organization: {
          sacemId: result.declaration.organization.sacemId,
          sacdId: result.declaration.organization.sacdId,
        },
        eventSerie: {
          // TODO
        },
        events: [], // TODO
      });

      push(['trackEvent', 'declaration', 'fill']);
    },
    [fillDeclaration, reset, eventSerieId]
  );

  useEffect(() => {
    if (getDeclaration.data) {
      if (!formInitialized) {
        setFormInitialized(true); // It's needed otherwise if you blur/focus again the window the new fetch data will override the "dirty form data"

        // Update the form with fetched data
        reset({
          eventSerieId: eventSerieId,
          organization: {
            sacemId: getDeclaration.data.declarationWrapper.declaration.organization.sacemId,
            sacdId: getDeclaration.data.declarationWrapper.declaration.organization.sacdId,
          },
          eventSerie: {
            producerOfficialId: getDeclaration.data.declarationWrapper.declaration.eventSerie.producerOfficialId,
            producerName: getDeclaration.data.declarationWrapper.declaration.eventSerie.producerName,
            performanceType: getDeclaration.data.declarationWrapper.declaration.eventSerie.performanceType,
            expectedDeclarationTypes: getDeclaration.data.declarationWrapper.declaration.eventSerie.expectedDeclarationTypes,
            placeId: getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.id ?? null,
            placeCapacity: getDeclaration.data.declarationWrapper.declaration.eventSerie.placeCapacity,
            audience: getDeclaration.data.declarationWrapper.declaration.eventSerie.audience,
            taxRate: getDeclaration.data.declarationWrapper.declaration.eventSerie.taxRate,
            expensesExcludingTaxes: getDeclaration.data.declarationWrapper.declaration.eventSerie.expensesExcludingTaxes,
          },
          events: [], // TODO
        });
      }
    }
  }, [getDeclaration.data, formInitialized, setFormInitialized, reset, eventSerieId]);

  // To ease the UX we use input masks
  const setters = useMemo(() => {
    return {
      setSacemId: (value: string) => setValue('organization.sacemId', value),
      setSacdId: (value: string) => setValue('organization.sacdId', value),
      setExpensesExcludingTaxes: (value: number) => setValue('eventSerie.expensesExcludingTaxes', value),
    };
  }, [setValue]);

  const { inputRef: sacemIdMaskInputRef } = useSacemIdInput({
    defaultValue: control._defaultValues.organization?.sacemId?.toString() ?? '',
    onChange: setters.setSacemId,
  });

  const { inputRef: sacdIdMaskInputRef } = useSacdIdInput({
    defaultValue: control._defaultValues.organization?.sacdId?.toString() ?? '',
    onChange: setters.setSacdId,
  });

  const { inputRef: expensesExcludingTaxesMaskInputRef } = useAmountInput({
    defaultValue: control._defaultValues.eventSerie?.expensesExcludingTaxes?.toString() ?? '',
    onChange: setters.setExpensesExcludingTaxes,
  });

  const { computedStartAt, computedEndAt, eventsKeyFigures } = useMemo(() => {
    if (getDeclaration.data && getDeclaration.data.declarationWrapper.declaration.events.length > 0) {
      const ascendingEvents = getDeclaration.data.declarationWrapper.declaration.events.sort((a, b) => +a.startAt - +b.startAt);

      return {
        computedStartAt: ascendingEvents[0].startAt,
        computedEndAt: ascendingEvents[ascendingEvents.length - 1].endAt ?? ascendingEvents[ascendingEvents.length - 1].startAt,
        eventsKeyFigures: getEventsKeyFigures(getDeclaration.data.declarationWrapper.declaration.events),
      };
    } else {
      return {
        computedStartAt: new Date(0),
        computedEndAt: new Date(0),
        eventsKeyFigures: getEventsKeyFigures([]),
      };
    }
  }, [getDeclaration.data]);

  if (aggregatedQueries.isPending) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (aggregatedQueries.hasError) {
    return (
      <div className={fr.cx('fr-container', 'fr-py-12v')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-md-8', 'fr-col-lg-6')}>
            <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
          </div>
        </div>
      </div>
    );
  }

  const declarationWrapper = getDeclaration.data!.declarationWrapper;
  const declaration = declarationWrapper.declaration;

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')} style={{ height: '100%' }}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')} style={{ height: '100%' }}>
        {declaration.events.length > 0 ? (
          <>
            <div className={fr.cx('fr-col-12')}>TODO: set in modal</div>
            <div className={fr.cx('fr-col-12')}>
              <Checkbox
                legend="Légende pour l’ensemble des champs"
                options={Object.values(DeclarationTypeSchema.Values).map((declarationType) => {
                  return {
                    label: t(`model.declarationType.enum.${declarationType}`),
                    nativeInputProps: {
                      name: `checkbox-${declarationType}`,
                      value: declarationType,
                      defaultChecked: modalSelectedDeclarationTypes.includes(declarationType),
                      onChange: (event) => {
                        const newSelectedDeclarationsTypes = new Set<DeclarationTypeSchemaType>(modalSelectedDeclarationTypes);

                        if (event.target.checked) {
                          newSelectedDeclarationsTypes.add(declarationType);
                        } else {
                          newSelectedDeclarationsTypes.delete(declarationType);
                        }

                        // maybe options should be useMemo ?

                        // newSelectedDeclarationsTypes.values().

                        setModalSelectedDeclarationTypes([...newSelectedDeclarationsTypes.values()]);
                        console.log(111111);
                        console.log(event);

                        //
                        //
                        // TODO:
                        // TODO:
                        // TODO: ou faire un subform juste pour la modal... avec des register(declarationType)
                        // TODO: en utilisant useForm<DeclarationTypeSchemaType>
                        // TODO: ... et au moment du submit... checker les valeurs et faire ".push()" pour un setValues du form principal
                        // TODO:
                        // TODO:
                        // TODO: faire un comp dédié xxForm... ?
                        // TODO:
                        // TODO:
                        //
                        //
                      },
                    },
                  };
                })}
                orientation="vertical"
              />
              <div className={fr.cx('fr-col-12')}>
                <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="connecter un système de billetterie">
                  <div className={fr.cx('fr-col-12')}>
                    <fieldset className={fr.cx('fr-fieldset')}>
                      <h2 className={fr.cx('fr-h4')}>Déclarant</h2>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Nom de la structure"
                          disabled
                          nativeInputProps={{
                            value: declaration.organization.name,
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="SIRET"
                          disabled
                          nativeInputProps={{
                            value: formatMaskedValue(officialHeadquartersIdMask, declaration.organization.officialHeadquartersId),
                          }}
                        />
                      </div>
                      {watch('organization.sacemId') !== null && (
                        <div className={fr.cx('fr-fieldset__element')}>
                          <Controller
                            control={control}
                            name="organization.sacemId"
                            defaultValue={control._defaultValues.organization?.sacemId ?? ''}
                            render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                              return (
                                <Input
                                  label="Identifiant Sacem"
                                  state={!!error ? 'error' : undefined}
                                  stateRelatedMessage={error?.message}
                                  nativeInputProps={{
                                    ref: sacemIdMaskInputRef as Ref<HTMLInputElement> | undefined,
                                    placeholder: '000000',
                                    onBlur: onBlur,
                                  }}
                                />
                              );
                            }}
                          />
                        </div>
                      )}
                      {watch('organization.sacdId') !== null && (
                        <div className={fr.cx('fr-fieldset__element')}>
                          <Controller
                            control={control}
                            name="organization.sacdId"
                            defaultValue={control._defaultValues.organization?.sacdId ?? ''}
                            render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                              return (
                                <Input
                                  label="Identifiant SACD"
                                  state={!!error ? 'error' : undefined}
                                  stateRelatedMessage={error?.message}
                                  nativeInputProps={{
                                    ref: sacdIdMaskInputRef as Ref<HTMLInputElement> | undefined,
                                    placeholder: '000000',
                                    onBlur: onBlur,
                                  }}
                                />
                              );
                            }}
                          />
                        </div>
                      )}
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Raison sociale du producteur"
                          state={!!errors.eventSerie?.producerName ? 'error' : undefined}
                          stateRelatedMessage={errors?.eventSerie?.producerName?.message}
                          nativeInputProps={{
                            // TODO: from enterprise directory
                            ...register('eventSerie.producerName'),
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Select
                          label="Genre"
                          state={!!errors.eventSerie?.performanceType ? 'error' : undefined}
                          stateRelatedMessage={errors?.eventSerie?.performanceType?.message}
                          nativeSelectProps={{
                            ...register('eventSerie.performanceType'),
                            defaultValue: control._defaultValues.eventSerie?.performanceType || '',
                          }}
                          options={[
                            ...Object.values(PerformanceTypeSchema.Values).map((performanceType) => {
                              return {
                                label: t(`model.performanceType.enum.${performanceType}`),
                                value: performanceType,
                              };
                            }),
                          ].sort((a, b) => a.label.localeCompare(b.label))}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Date"
                          disabled
                          nativeInputProps={{
                            value: `${t('date.long', { date: computedStartAt })}  →  ${t('date.long', {
                              date: computedEndAt,
                            })}`,
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Représentations"
                          disabled
                          nativeInputProps={{
                            value: declaration.events.length,
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Autocomplete
                          disablePortal
                          options={declarationWrapper.placeholder.place}
                          renderInput={({ InputProps, disabled, id, inputProps }) => {
                            return (
                              <Input
                                ref={InputProps.ref}
                                label="Intitulé du lieu"
                                id={id}
                                disabled={disabled}
                                state={!!errors.eventSerie?.placeTmp ? 'error' : undefined}
                                stateRelatedMessage={errors?.eventSerie?.placeTmp?.message}
                                nativeInputProps={{
                                  ...inputProps,
                                  placeholder: 'Saisie ou recherche',
                                }}
                              />
                            );
                          }}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props;

                            return (
                              <li key={key} {...otherProps} data-sentry-mask>
                                <span className={fr.cx('fr-text--bold')}>{option.name}</span>
                                &nbsp;
                                <span style={{ fontStyle: 'italic' }}>
                                  (
                                  {addressFormatter
                                    .format({
                                      street: option.address.street,
                                      city: option.address.city,
                                      postcode: option.address.postalCode,
                                      state: option.address.subdivision,
                                      countryCode: option.address.countryCode,
                                    })
                                    .trim()}
                                  )
                                </span>
                              </li>
                            );
                          }}
                          isOptionEqualToValue={(option, value) => JSON.stringify(option) === JSON.stringify(value)} // TODO
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') {
                              // Value selected with enter, right from the input
                              return option;
                            } else {
                              return option.name;
                            }
                          }}
                          onChange={(event, newValue) => {
                            if (newValue) {
                              if (typeof newValue === 'string') {
                                setValue('eventSerie.placeTmp', {
                                  name: newValue,
                                  address: null,
                                });
                              } else {
                                setValue('eventSerie.placeTmp', {
                                  id: newValue.id,
                                });
                              }
                            } else {
                              setValue('eventSerie.placeTmp', null);
                            }
                          }}
                          freeSolo
                          selectOnFocus
                          handleHomeEndKeys
                          fullWidth
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Adresse"
                          // state={!!errors.eventSerie?.placeId ? 'error' : undefined}
                          // stateRelatedMessage={errors?.eventSerie?.placeId?.message}
                          nativeInputProps={
                            {
                              // TODO: should use address directory (BAN)
                              // ...register('eventSerie.placeId'),
                            }
                          }
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Select
                          label="Audience"
                          state={!!errors.eventSerie?.audience ? 'error' : undefined}
                          stateRelatedMessage={errors?.eventSerie?.audience?.message}
                          nativeSelectProps={{
                            ...register('eventSerie.audience'),
                            defaultValue: control._defaultValues.eventSerie?.audience || '',
                          }}
                          options={[
                            ...Object.values(AudienceSchema.Values).map((audience) => {
                              return {
                                label: t(`model.audience.enum.${audience}`),
                                value: audience,
                              };
                            }),
                          ].sort((a, b) => a.label.localeCompare(b.label))}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Select
                          label="Taux de TVA"
                          state={!!errors.eventSerie?.taxRate ? 'error' : undefined}
                          stateRelatedMessage={errors?.eventSerie?.taxRate?.message}
                          nativeSelectProps={{
                            ...register('eventSerie.taxRate'),
                            defaultValue: currentTaxRates[0],
                          }}
                          options={currentTaxRates.map((taxRate) => {
                            return {
                              label: t('number.percent', {
                                percentage: taxRate,
                              }),
                              value: taxRate.toString(),
                            };
                          })}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Recette HT"
                          disabled
                          nativeInputProps={{
                            value: t('currency.amount', {
                              amount: eventsKeyFigures.ticketingRevenueExcludingTaxes,
                            }),
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Recette TTC"
                          disabled
                          nativeInputProps={{
                            value: t('currency.amount', {
                              amount: eventsKeyFigures.ticketingRevenueIncludingTaxes,
                            }),
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Entrées payantes"
                          disabled
                          nativeInputProps={{
                            value: t('number.default', {
                              number: eventsKeyFigures.paidTickets,
                            }),
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Input
                          label="Entrées gratuites"
                          disabled
                          nativeInputProps={{
                            value: t('number.default', {
                              number: eventsKeyFigures.freeTickets,
                            }),
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Controller
                          control={control}
                          name="eventSerie.expensesExcludingTaxes"
                          defaultValue={control._defaultValues.eventSerie?.expensesExcludingTaxes ?? 0}
                          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                            return (
                              <Input
                                label="Dépenses globales HT"
                                state={!!error ? 'error' : undefined}
                                stateRelatedMessage={error?.message}
                                nativeInputProps={{
                                  ref: expensesExcludingTaxesMaskInputRef as Ref<HTMLInputElement> | undefined,
                                  placeholder: '0 €',
                                  onBlur: onBlur,
                                }}
                              />
                            );
                          }}
                        />
                      </div>
                    </fieldset>
                  </div>
                </BaseForm>
              </div>
            </div>
          </>
        ) : (
          <div className={fr.cx('fr-col-12')}>Aucune représentation n'est associée à ce spectacle, il n'y a donc pas de déclaration à faire.</div>
        )}
      </div>
    </div>
  );

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
            eventSerie={eventSerie}
            eventsWrappers={eventsWrappers}
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
                            disabled={alreadyDeclared}
                            options={sacemDeclarationWrapper.placeholder.clientId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="N° client" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
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
                            disabled={alreadyDeclared}
                            options={sacemDeclarationWrapper.placeholder.placeName}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Intitulé (de la salle ou du lieu)"
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
                      name="placeCapacity"
                      defaultValue={control._defaultValues.placeCapacity}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
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
                      name="placePostalCode"
                      defaultValue={control._defaultValues.placePostalCode || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
                            options={sacemDeclarationWrapper.placeholder.placePostalCode}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Code postal du lieu"
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
                      name="managerName"
                      defaultValue={control._defaultValues.managerName || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            disabled={alreadyDeclared}
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
                            disabled={alreadyDeclared}
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
                    <Tooltip title={alreadyDeclared ? '' : 'Cet intitulé est non modifiable car il provient de votre système de billetterie'}>
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
                          {alreadyDeclared ? (
                            ''
                          ) : (
                            <>
                              <br />
                              <br />
                              Ces dates sont non modifiables car elles proviennent de votre système de billetterie
                            </>
                          )}
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
                    <Tooltip title={alreadyDeclared ? '' : 'Cette valeur est non modifiable car elle provient de votre système de billetterie'}>
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
                            disabled={alreadyDeclared}
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
                        alreadyDeclared
                          ? ''
                          : 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
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
                        alreadyDeclared
                          ? ''
                          : 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
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
                    {/* <SacemRevenuesTable control={control} trigger={trigger} errors={errors.revenues} readonly={alreadyDeclared} /> */}
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
                    {/* <SacemExpensesTable control={control} trigger={trigger} errors={errors.expenses} readonly={alreadyDeclared} /> */}
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
                        loading={fillDeclaration.isPending}
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
                          Télécharger la déclaration
                        </Button>
                      </Grid>
                      <Grid item xs>
                        {alreadyDeclared ? (
                          <Button disabled={true} size="large" variant="contained" fullWidth startIcon={<CheckCircle />}>
                            Télédéclaration le {t('date.shortWithTime', { date: sacemDeclarationWrapper.declaration.transmittedAt })}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              showConfirmationDialog({
                                description: (
                                  <>
                                    Êtes-vous sûr de vouloir transmettre ces informations à la SACEM pour le spectacle{' '}
                                    <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                      {eventSerie.name}
                                    </Typography>{' '}
                                    ?
                                    <br />
                                    <br />
                                    <Typography component="span" variant="body2" sx={{ fontStyle: 'italic' }}>
                                      Après envoi, aucune modification ne pourra être opérée depuis notre interface. Pour toute correction ou
                                      amendement de la déclaration, il faudra directement contacter votre interlocuteur SACEM.
                                    </Typography>
                                  </>
                                ),
                                onConfirm: async () => {
                                  const result = await transmitDeclaration.mutateAsync({
                                    eventSerieId: eventSerieId,
                                    type: DeclarationTypeSchema.Values.SACEM,
                                  });

                                  push(['trackEvent', 'declaration', 'transmit', 'type', DeclarationTypeSchema.Values.SACEM]);
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
              Aucune date n&apos;a pu être récupérée pour ce spectacle. Il n&apos;y a donc aucune déclaration à faire à la SACEM.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
