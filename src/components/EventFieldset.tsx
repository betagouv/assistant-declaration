import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/SelectNext';
import addressFormatter from '@fragaria/address-formatter';
import { Autocomplete } from '@mui/material';
import { useMemo } from 'react';
import { Control, Controller, FieldErrors, UseFormRegister, UseFormSetValue, UseFormTrigger, UseFormWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { AddressField } from '@ad/src/components/AddressField';
import { AmountInput } from '@ad/src/components/AmountInput';
import { currentTaxRates } from '@ad/src/core/declaration';
import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/common';
import { AudienceSchema } from '@ad/src/models/entities/event';

export interface EventFieldsetProps {
  control: Control<FillDeclarationSchemaType, any>;
  register: UseFormRegister<FillDeclarationSchemaType>;
  setValue: UseFormSetValue<FillDeclarationSchemaType>;
  watch: UseFormWatch<FillDeclarationSchemaType>;
  trigger: UseFormTrigger<FillDeclarationSchemaType>;
  eventIndex: number;
  name: `events.${number}`;
  placeholder: DeclarationWrapperSchemaType['placeholder'];
  errors: FieldErrors<NonNullable<FillDeclarationSchemaType>['events']>[0];
  readonly?: boolean;
}

export function EventFieldset({ control, register, setValue, watch, trigger, eventIndex, name, placeholder, errors, readonly }: EventFieldsetProps) {
  const { t } = useTranslation('common');

  const errorMessage = useMemo(() => errors?.root?.message ?? errors?.message, [errors]);

  return (
    <>
      <h2 className={fr.cx('fr-h4')} data-sentry-mask>
        Séance du {t('date.shortWithTime', { date: watch(`${name}.startAt`) })}
      </h2>
      {errorMessage && (
        <div className={fr.cx('fr-grid-row')}>
          <div className={fr.cx('fr-col-12', 'fr-mb-4v')}>
            <Alert severity="error" small={true} description={errorMessage} />
          </div>
        </div>
      )}
      <div className={fr.cx('fr-grid-row')}>
        <div className={fr.cx('fr-col-12')}>
          <div className={fr.cx('fr-mb-2v')} style={{ color: fr.colors.decisions.text.label.blueCumulus.default }}>
            Général
          </div>
        </div>
      </div>
      <div className={fr.cx('fr-grid-row')}>
        <div className={fr.cx('fr-col-8', 'fr-col-md-3')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Select
              label="Audience"
              state={!!errors?.audienceOverride ? 'error' : undefined}
              stateRelatedMessage={errors?.audienceOverride?.message}
              nativeSelectProps={{
                ...register(`${name}.audienceOverride`),
                defaultValue: control._defaultValues.events?.[eventIndex]?.audienceOverride || '',
              }}
              options={[
                ...AudienceSchema.options.map((audience) => {
                  return {
                    label: t(`model.audience.enum.${audience}`),
                    value: audience,
                  };
                }),
              ].sort((a, b) => a.label.localeCompare(b.label))}
            />
          </div>
        </div>
        <div className={fr.cx('fr-col-4', 'fr-col-md-3')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Select
              label="Taux de TVA"
              state={!!errors?.ticketingRevenueTaxRateOverride ? 'error' : undefined}
              stateRelatedMessage={errors?.ticketingRevenueTaxRateOverride?.message}
              nativeSelectProps={{
                ...register(`${name}.ticketingRevenueTaxRateOverride`, {
                  valueAsNumber: true,
                }),
                defaultValue: (control._defaultValues.events?.[eventIndex]?.ticketingRevenueTaxRateOverride ?? currentTaxRates[0]).toString(),
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
        </div>
      </div>
      <div className={fr.cx('fr-grid-row')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.placeOverride.name`}
              defaultValue={control._defaultValues.events?.[eventIndex]?.placeOverride?.name ?? null}
              render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                return (
                  <Autocomplete
                    disablePortal
                    options={placeholder.place}
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
                      setValue(`${name}.placeOverride.name`, newValue, { shouldDirty: true });
                    }}
                    onChange={(event, newValue) => {
                      if (newValue) {
                        if (typeof newValue === 'string') {
                          onChange(newValue);
                        } else {
                          onChange(newValue.name);

                          // Override the current address used
                          setValue(`${name}.placeOverride.address`, newValue.address, { shouldDirty: true });
                        }
                      } else {
                        setValue(`${name}.placeOverride.name`, null, { shouldDirty: true });
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
        </div>
        <div className={fr.cx('fr-col-8', 'fr-col-md-5')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.placeOverride.address`}
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
        </div>
        <div className={fr.cx('fr-col-4', 'fr-col-md-2')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.placeCapacityOverride`}
              defaultValue={control._defaultValues.eventSerie?.placeCapacity ?? 0}
              render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                return (
                  <Autocomplete
                    options={placeholder.placeCapacity}
                    freeSolo
                    onBlur={onBlur}
                    value={value ?? 0}
                    onInputChange={(event, newValue, reason) => {
                      onChange(parseInt(newValue, 10)); // Needed since underlying it's managing string only
                    }}
                    renderInput={({ InputProps, disabled, id, inputProps }) => {
                      return (
                        <Input
                          ref={InputProps.ref}
                          label="Jauge"
                          id={id}
                          disabled={disabled}
                          state={!!error ? 'error' : undefined}
                          stateRelatedMessage={error?.message}
                          nativeInputProps={{
                            ...inputProps,
                            type: 'number',
                            placeholder: '0',
                            step: 1,
                            min: 0,
                            onWheel: (event) => {
                              // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

                              // `event.currentTarget` is a callable type but is targetting the MUI element
                              // whereas `event.target` targets the input element but does not have the callable type, so casting
                              (event.target as HTMLInputElement).blur();
                            },
                          }}
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
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') {
                        // Value selected with enter, right from the input
                        return option;
                      } else {
                        return option.toString();
                      }
                    }}
                  />
                );
              }}
            />
          </div>
        </div>
      </div>
      <div className={fr.cx('fr-grid-row')}>
        <div className={fr.cx('fr-col-12')}>
          <div className={fr.cx('fr-mb-2v')} style={{ color: fr.colors.decisions.text.label.blueCumulus.default }}>
            Billetterie
          </div>
        </div>
      </div>
      <div className={fr.cx('fr-grid-row')}>
        <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.freeTickets`}
              render={({ field: { ref, onChange, ...fieldOthers }, fieldState: { error } }) => {
                return (
                  <Input
                    ref={ref}
                    label="Billets gratuits"
                    state={!!error ? 'error' : undefined}
                    stateRelatedMessage={error?.message}
                    nativeInputProps={{
                      ...fieldOthers,
                      type: 'number',
                      placeholder: '0',
                      step: 1,
                      min: 0,
                      onChange: (event) => {
                        onChange(event.target.value === '' ? null : Number(event.target.value));
                      },
                      onWheel: (event) => {
                        // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

                        // `event.currentTarget` is a callable type but is targetting the MUI element
                        // whereas `event.target` targets the input element but does not have the callable type, so casting
                        (event.target as HTMLInputElement).blur();
                      },
                    }}
                  />
                );
              }}
            />
          </div>
        </div>
        <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.paidTickets`}
              render={({ field: { ref, onChange, ...fieldOthers }, fieldState: { error } }) => {
                return (
                  <Input
                    ref={ref}
                    label="Billets payants"
                    state={!!error ? 'error' : undefined}
                    stateRelatedMessage={error?.message}
                    nativeInputProps={{
                      ...fieldOthers,
                      type: 'number',
                      placeholder: '0',
                      step: 1,
                      min: 0,
                      onChange: (event) => {
                        onChange(event.target.value === '' ? null : Number(event.target.value));
                      },
                      onWheel: (event) => {
                        // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

                        // `event.currentTarget` is a callable type but is targetting the MUI element
                        // whereas `event.target` targets the input element but does not have the callable type, so casting
                        (event.target as HTMLInputElement).blur();
                      },
                    }}
                  />
                );
              }}
            />
          </div>
        </div>
        <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.ticketingRevenueExcludingTaxes`}
              render={({ field, fieldState: { error } }) => {
                return <AmountInput {...field} label="Montant HT" signed={false} errorMessage={error?.message} />;
              }}
            />
          </div>
        </div>
        <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.ticketingRevenueIncludingTaxes`}
              render={({ field, fieldState: { error } }) => {
                return <AmountInput {...field} label="Montant TTC" signed={false} errorMessage={error?.message} />;
              }}
            />
          </div>
        </div>
      </div>
      {watch('eventSerie.expectedDeclarationTypes').includes('SACEM') && (
        <>
          <div className={fr.cx('fr-grid-row')}>
            <div className={fr.cx('fr-col-12')}>
              <div className={fr.cx('fr-mb-2v')} style={{ color: fr.colors.decisions.text.label.blueCumulus.default }}>
                Recettes hors billetterie
              </div>
            </div>
          </div>
          <div className={fr.cx('fr-grid-row')}>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.consumptionsRevenueExcludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Consommation HT" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.consumptionsRevenueIncludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Consommation TTC" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.cateringRevenueExcludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Restauration HT" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.cateringRevenueIncludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Restauration TTC" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.programSalesRevenueExcludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Vente prog. HT" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.programSalesRevenueIncludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Vente prog. TTC" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.otherRevenueExcludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Autre recette HT" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.otherRevenueIncludingTaxes`}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Autre recette TTC" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
