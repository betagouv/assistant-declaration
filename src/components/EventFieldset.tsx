import { fr } from '@codegouvfr/react-dsfr';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Ref, useMemo } from 'react';
import { Control, Controller, FieldErrors, UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useAmountInput } from '@ad/src/components/AmountInput';
import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';

export interface EventFieldsetProps {
  control: Control<FillDeclarationSchemaType, any>;
  setValue: UseFormSetValue<FillDeclarationSchemaType>;
  trigger: UseFormTrigger<FillDeclarationSchemaType>;
  eventIndex: number;
  name: `events.${number}`;
  errors: FieldErrors<NonNullable<FillDeclarationSchemaType>['events']>[0];
  readonly?: boolean;
}

export function EventFieldset({ control, setValue, trigger, eventIndex, name, errors, readonly }: EventFieldsetProps) {
  const { t } = useTranslation('common');

  // To ease the UX we use input masks
  const setters = useMemo(() => {
    return {
      setTicketingRevenueExcludingTaxes: (value: number) => setValue(`${name}.ticketingRevenueExcludingTaxes`, value),
      setTicketingRevenueIncludingTaxes: (value: number) => setValue(`${name}.ticketingRevenueIncludingTaxes`, value),
    };
  }, [setValue]);

  const { inputRef: ticketingRevenueExcludingTaxesMaskInputRef } = useAmountInput({
    defaultValue: control._defaultValues.events?.[eventIndex]?.ticketingRevenueExcludingTaxes?.toString() ?? '',
    onChange: setters.setTicketingRevenueExcludingTaxes,
  });
  const { inputRef: ticketingRevenueIncludingTaxesMaskInputRef } = useAmountInput({
    defaultValue: control._defaultValues.events?.[eventIndex]?.ticketingRevenueIncludingTaxes?.toString() ?? '',
    onChange: setters.setTicketingRevenueIncludingTaxes,
  });

  return (
    <div className={fr.cx('fr-grid-row')}>
      <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
        <div className={fr.cx('fr-fieldset__element')}>
          <Controller
            control={control}
            name={`${name}.freeTickets`}
            render={({ field: { ref, ...fieldOthers }, fieldState: { error } }) => {
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
            render={({ field: { ref, ...fieldOthers }, fieldState: { error } }) => {
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
            render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
              return (
                <Input
                  label="Montant HT"
                  state={!!error ? 'error' : undefined}
                  stateRelatedMessage={error?.message}
                  nativeInputProps={{
                    ref: ticketingRevenueExcludingTaxesMaskInputRef as Ref<HTMLInputElement> | undefined,
                    placeholder: '0 €',
                    onBlur: onBlur,
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
            name={`${name}.ticketingRevenueIncludingTaxes`}
            render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
              return (
                <Input
                  label="Montant TTC"
                  state={!!error ? 'error' : undefined}
                  stateRelatedMessage={error?.message}
                  nativeInputProps={{
                    ref: ticketingRevenueIncludingTaxesMaskInputRef as Ref<HTMLInputElement> | undefined,
                    placeholder: '0 €',
                    onBlur: onBlur,
                  }}
                />
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
