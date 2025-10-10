'use client';

import { Input } from '@codegouvfr/react-dsfr/Input';
import { FactoryOpts, InputMask } from 'imask';
import { Ref, useCallback, useEffect } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { useIMask } from 'react-imask';

import { i18n } from '@ad/src/i18n';

function getNumberSeparators(locale: string) {
  const numberWithGroupAndDecimal = 1000.1;
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(numberWithGroupAndDecimal);

  let group = '';
  let decimal = '';

  for (let part of parts) {
    if (part.type === 'group') group = part.value;
    if (part.type === 'decimal') decimal = part.value;
  }

  return { group, decimal };
}

export function AmountMaskFactory(locale: string, signed?: boolean): FactoryOpts {
  const separators = getNumberSeparators(locale);

  return {
    mask: [
      { mask: '' },
      {
        mask: 'num €',
        lazy: false,
        blocks: {
          num: {
            mask: Number,
            scale: 2,
            thousandsSeparator: separators.group,
            radix: separators.decimal,
            mapToRadix: separators.decimal === ',' ? [','] : ['.'],
            ...({ signed: signed ?? true } as any), // Cast since not recognized
          },
        },
        overwrite: 'shift',
      },
    ],
  };
}

interface UseAmountInputProps extends Pick<ControllerRenderProps<any, string>, 'onChange'> {
  defaultValue: number;
  signed?: boolean;
}

export function useAmountInput({ defaultValue, onChange, signed }: UseAmountInputProps) {
  const onAccept = useCallback<(value: InputMask<FactoryOpts>['value'], maskRef: InputMask<FactoryOpts>, e?: InputEvent) => void>(
    (maskedValue, mask, event) => {
      onChange(parseFloat(mask.unmaskedValue)); // Needed since underlying it's managing string only
    },
    [onChange]
  );

  const { ref: inputRef, setUnmaskedValue } = useIMask(AmountMaskFactory(i18n.language, signed), {
    onAccept: onAccept,
  });

  // The following is needed to synchronize "form state" into the masked input in case a `reset()` is used
  useEffect(() => {
    if (defaultValue != null) {
      setUnmaskedValue(defaultValue.toString());
    }
  }, [defaultValue, setUnmaskedValue]);

  return { inputRef: inputRef };
}

interface AmountInputProps extends ControllerRenderProps<any, string> {
  label: string;
  signed?: boolean;
  errorMessage?: string;
}

export function AmountInput(props: AmountInputProps) {
  const { inputRef: maskInputRef } = useAmountInput({
    defaultValue: props.value,
    onChange: props.onChange,
    signed: props.signed,
  });

  return (
    <Input
      label={props.label}
      state={!!props.errorMessage ? 'error' : undefined}
      stateRelatedMessage={props.errorMessage}
      nativeInputProps={{
        ref: maskInputRef as Ref<HTMLInputElement> | undefined,
        placeholder: '0 €',
        onChange: props.onChange,
        onBlur: props.onBlur,
      }}
    />
  );
}
