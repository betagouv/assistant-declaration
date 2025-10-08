'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/SelectNext';
import addressFormatter from '@fragaria/address-formatter';
import { zodResolver } from '@hookform/resolvers/zod';
import { Autocomplete } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import { Ref, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { DeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPageContext';
import { trpc } from '@ad/src/client/trpcClient';
import { AddressField } from '@ad/src/components/AddressField';
import { useAmountInput } from '@ad/src/components/AmountInput';
import { BaseForm } from '@ad/src/components/BaseForm';
import { CompanyField } from '@ad/src/components/CompanyField';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { officialHeadquartersIdMask } from '@ad/src/components/OfficialHeadquartersIdField';
import { useSacdIdInput } from '@ad/src/components/SacdIdField';
import { useSacemIdInput } from '@ad/src/components/SacemIdField';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { useConfirmationIfUnsavedChange } from '@ad/src/components/navigation/useConfirmationIfUnsavedChange';
import { currentTaxRates } from '@ad/src/core/declaration';
import { getEventsKeyFigures } from '@ad/src/core/declaration/format';
import { FillDeclarationSchema, FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { AudienceSchema, PerformanceTypeSchema } from '@ad/src/models/entities/event';
import { formatMaskedValue } from '@ad/src/utils/imask';
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
            producer:
              getDeclaration.data.declarationWrapper.declaration.eventSerie.producerOfficialId &&
              getDeclaration.data.declarationWrapper.declaration.eventSerie.producerName
                ? {
                    officialId: getDeclaration.data.declarationWrapper.declaration.eventSerie.producerOfficialId,
                    name: getDeclaration.data.declarationWrapper.declaration.eventSerie.producerName,
                  }
                : null,
            performanceType: getDeclaration.data.declarationWrapper.declaration.eventSerie.performanceType,
            expectedDeclarationTypes: getDeclaration.data.declarationWrapper.declaration.eventSerie.expectedDeclarationTypes,
            placeId: getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.id ?? null,
            placeTmp: {
              name: getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.name ?? null,
              address: getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.address ?? null,
            },
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
                        <Controller
                          control={control}
                          name="eventSerie.producer"
                          defaultValue={null}
                          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                            return (
                              <CompanyField
                                value={value}
                                defaultSuggestions={declarationWrapper.placeholder.producer}
                                inputProps={{
                                  label: 'Raison sociale du producteur',
                                  nativeInputProps: {
                                    placeholder: 'Recherche',
                                  },
                                }}
                                onChange={(newValue) => {
                                  onChange(newValue);
                                }}
                                onBlur={onBlur}
                                errorMessage={error?.message}
                              />
                            );
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
                        <Controller
                          control={control}
                          name="eventSerie.placeTmp.name"
                          defaultValue={control._defaultValues.eventSerie?.placeTmp?.name ?? null}
                          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                            return (
                              <Autocomplete
                                disablePortal
                                options={declarationWrapper.placeholder.place}
                                value={value}
                                renderInput={({ InputProps, disabled, id, inputProps }) => {
                                  return (
                                    <Input
                                      ref={InputProps.ref}
                                      label="Intitulé du lieu"
                                      id={id}
                                      disabled={disabled}
                                      state={!!error ? 'error' : undefined}
                                      stateRelatedMessage={error?.message}
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
                                onInputChange={(event: React.SyntheticEvent<Element, Event>, newValue: string) => {
                                  setValue('eventSerie.placeTmp.name', newValue);
                                }}
                                onChange={(event, newValue) => {
                                  if (newValue) {
                                    if (typeof newValue === 'string') {
                                      onChange(newValue);
                                    } else {
                                      onChange(newValue.name);

                                      // Override the current address used
                                      setValue('eventSerie.placeTmp.address', newValue.address);
                                    }
                                  } else {
                                    setValue('eventSerie.placeTmp.name', null);
                                  }
                                }}
                                onBlur={onBlur}
                                freeSolo
                                selectOnFocus
                                handleHomeEndKeys
                                fullWidth
                              />
                            );
                          }}
                        />
                      </div>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <Controller
                          control={control}
                          name="eventSerie.placeTmp.address"
                          defaultValue={null}
                          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                            return (
                              <AddressField
                                value={value}
                                inputProps={{
                                  label: 'Adresse du lieu',
                                  nativeInputProps: {
                                    placeholder: 'Recherche',
                                  },
                                }}
                                onChange={(newValue) => {
                                  onChange(newValue);
                                }}
                                onBlur={onBlur}
                                errorMessage={error?.message}
                              />
                            );
                          }}
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
}
