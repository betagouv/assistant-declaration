import { fr } from '@codegouvfr/react-dsfr';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/SelectNext';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import addressFormatter from '@fragaria/address-formatter';
import { Autocomplete } from '@mui/material';
import { useMemo } from 'react';
import { Control, Controller, FieldErrors, UseFormRegister, UseFormSetValue, UseFormTrigger, UseFormWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { AddressField } from '@ad/src/components/AddressField';
import { AmountInput } from '@ad/src/components/AmountInput';
import styles from '@ad/src/components/EventFieldset.module.scss';
import { currentTaxRates } from '@ad/src/core/declaration';
import { FillDeclarationSchema } from '@ad/src/models/actions/declaration';
import { DeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/common';
import { AudienceSchema } from '@ad/src/models/entities/event';

type FillDeclarationSchemaInputType = z.input<typeof FillDeclarationSchema>;

export interface TicketingSectionProps {
  control: Control<FillDeclarationSchemaInputType, any>;
  register: UseFormRegister<FillDeclarationSchemaInputType>;
  name: `events.${number}`;
  errors: FieldErrors<NonNullable<FillDeclarationSchemaInputType>['events']>[0];
  readonly?: boolean;
}

export function TicketingSection({ control, register, name, errors, readonly }: TicketingSectionProps) {
  const { t } = useTranslation('common');

  return (
    <>
      <div className={fr.cx('fr-grid-row')}>
        <div className={fr.cx('fr-col-12')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <div className={fr.cx('fr-mb-2v', 'fr-mt-4v')} style={{ color: fr.colors.decisions.border.default.blueFrance.default }}>
              Billetterie
            </div>
          </div>
        </div>
      </div>
      <div className={fr.cx('fr-grid-row')}>
        <div className={fr.cx('fr-col-6', 'fr-col-md-2')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.freeTickets`}
              disabled={readonly}
              render={({ field: { ref, onChange, disabled, ...fieldOthers }, fieldState: { error } }) => {
                return (
                  <Input
                    ref={ref}
                    label="Billets gratuits"
                    disabled={disabled}
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
                      onFocusCapture: (event) => {
                        event.target.select(); // For the ease of modification select the whole on focus
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
        <div className={fr.cx('fr-col-6', 'fr-col-md-2')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.paidTickets`}
              disabled={readonly}
              render={({ field: { ref, onChange, disabled, ...fieldOthers }, fieldState: { error } }) => {
                return (
                  <Input
                    ref={ref}
                    label="Billets payants"
                    disabled={disabled}
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
                      onFocusCapture: (event) => {
                        event.target.select(); // For the ease of modification select the whole on focus
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
        <div className={fr.cx('fr-col-4', 'fr-col-md-2')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Select
              label="Taux de TVA"
              disabled={readonly}
              state={!!errors?.ticketingRevenueTaxRateOverride ? 'error' : undefined}
              stateRelatedMessage={errors?.ticketingRevenueTaxRateOverride?.message}
              nativeSelectProps={{
                ...register(`${name}.ticketingRevenueTaxRateOverride`, {
                  valueAsNumber: true,
                }),
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
        <div className={fr.cx('fr-col-4', 'fr-col-md-2')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.ticketingRevenueExcludingTaxes`}
              disabled={readonly}
              render={({ field, fieldState: { error } }) => {
                return <AmountInput {...field} label="Montant HT" signed={false} errorMessage={error?.message} />;
              }}
            />
          </div>
        </div>
        <div className={fr.cx('fr-col-4', 'fr-col-md-2')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name={`${name}.ticketingRevenueIncludingTaxes`}
              disabled={readonly}
              render={({ field, fieldState: { error } }) => {
                return <AmountInput {...field} label="Montant TTC" signed={false} errorMessage={error?.message} />;
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export interface EventFieldsetProps {
  control: Control<FillDeclarationSchemaInputType, any>;
  register: UseFormRegister<FillDeclarationSchemaInputType>;
  setValue: UseFormSetValue<FillDeclarationSchemaInputType>;
  watch: UseFormWatch<FillDeclarationSchemaInputType>;
  trigger: UseFormTrigger<FillDeclarationSchemaInputType>;
  eventIndex: number;
  name: `events.${number}`;
  placeholder: DeclarationWrapperSchemaType['placeholder'];
  eventSerieManuallyCreated: boolean;
  errors: FieldErrors<NonNullable<FillDeclarationSchemaInputType>['events']>[0];
  readonly?: boolean;
}

export function EventFieldset({
  control,
  register,
  setValue,
  watch,
  trigger,
  eventIndex,
  name,
  placeholder,
  eventSerieManuallyCreated,
  errors,
  readonly,
}: EventFieldsetProps) {
  const { t } = useTranslation('common');

  const errorMessage = useMemo(() => errors?.root?.message ?? errors?.message, [errors]);

  return (
    <>
      <div className={fr.cx('fr-fieldset__element')}>
        <h2 className={fr.cx('fr-h4')} data-sentry-mask>
          Séance du {t('date.shortWithTime', { date: watch(`${name}.startAt`) })}
        </h2>
      </div>
      {errorMessage && (
        <div className={fr.cx('fr-grid-row')}>
          <div className={fr.cx('fr-col-12', 'fr-mb-4v')}>
            <Alert severity="error" small={true} description={errorMessage} />
          </div>
        </div>
      )}
      {eventSerieManuallyCreated && <TicketingSection control={control} register={register} name={name} errors={errors} readonly={readonly} />}
      {watch('eventSerie.expectedDeclarationTypes').includes('SACEM') && (
        <>
          <div className={fr.cx('fr-grid-row')}>
            <div className={fr.cx('fr-col-12')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <div className={fr.cx('fr-mb-2v', 'fr-mt-4v')} style={{ color: fr.colors.decisions.border.default.blueFrance.default }}>
                  Recettes hors billetterie
                </div>
              </div>
            </div>
          </div>
          <div className={fr.cx('fr-grid-row')}>
            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.consumptionsRevenueExcludingTaxes`}
                  disabled={readonly}
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
                  disabled={readonly}
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
                  disabled={readonly}
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
                  disabled={readonly}
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
                  disabled={readonly}
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
                  disabled={readonly}
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
                  disabled={readonly}
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
                  disabled={readonly}
                  render={({ field, fieldState: { error } }) => {
                    return <AmountInput {...field} label="Autre recette TTC" signed={false} errorMessage={error?.message} />;
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
      <div className={fr.cx('fr-fieldset__element')}>
        <Accordion label="Données pré-remplies" className={cx(styles.accordion, fr.cx('fr-mt-2v', 'fr-mb-12v'))}>
          <div className={fr.cx('fr-grid-row')}>
            <div className={fr.cx('fr-col-12')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <div className={fr.cx('fr-mb-2v', 'fr-mt-2v')} style={{ color: fr.colors.decisions.border.default.blueFrance.default }}>
                  Général
                </div>
              </div>
            </div>
          </div>
          <div className={fr.cx('fr-grid-row')}>
            <div className={fr.cx('fr-col-8', 'fr-col-md-3')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Select
                  label="Type de public"
                  disabled={readonly}
                  state={!!errors?.audienceOverride ? 'error' : undefined}
                  stateRelatedMessage={errors?.audienceOverride?.message}
                  nativeSelectProps={{
                    ...register(`${name}.audienceOverride`),
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
          </div>
          <div className={fr.cx('fr-grid-row')}>
            <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
              <div className={fr.cx('fr-fieldset__element')}>
                <Controller
                  control={control}
                  name={`${name}.placeOverride.name`}
                  disabled={readonly}
                  render={({ field: { onChange, onBlur, value, ref, disabled }, fieldState: { error }, formState }) => {
                    return (
                      <Autocomplete
                        disablePortal
                        options={placeholder.place}
                        value={value}
                        inputValue={value ?? ''}
                        disabled={disabled}
                        renderInput={({ InputProps, disabled, id, inputProps }) => {
                          return (
                            <Input
                              ref={InputProps.ref}
                              label="Intitulé du lieu de la représentation"
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

                              const { id, ...newAddressInputValue } = newValue.address;

                              // Override the current address used
                              setValue(`${name}.placeOverride.address`, newAddressInputValue, { shouldDirty: true });
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
                  disabled={readonly}
                  render={({ field: { onChange, onBlur, value, ref, disabled }, fieldState: { error }, formState }) => {
                    return (
                      <AddressField
                        value={value}
                        inputProps={{
                          label: 'Adresse du lieu',
                          disabled: disabled,
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
                  disabled={readonly}
                  render={({ field: { onChange, onBlur, value, ref, disabled }, fieldState: { error }, formState }) => {
                    return (
                      <Autocomplete
                        options={placeholder.placeCapacity}
                        freeSolo
                        onBlur={onBlur}
                        value={value}
                        inputValue={value ? value.toString() : ''}
                        disabled={disabled}
                        onInputChange={(event, newValue, reason) => {
                          const parsedValue = parseInt(newValue, 10);

                          // The check is needed because the input value can be an empty string
                          onChange(!isNaN(parsedValue) ? parsedValue : null);
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
                                onFocusCapture: (event) => {
                                  event.target.select(); // For the ease of modification select the whole on focus
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
          {!eventSerieManuallyCreated && <TicketingSection control={control} register={register} name={name} errors={errors} readonly={readonly} />}
        </Accordion>
      </div>
    </>
  );
}
