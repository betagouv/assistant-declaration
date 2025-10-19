'use client';

import { Input } from '@codegouvfr/react-dsfr/Input';
import { FactoryOpts, InputMask } from 'imask';
import { Ref, useCallback, useEffect, useMemo } from 'react';
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
            ...({ signed: signed ?? true } as any), // Cast since not recognized
          },
        },
        overwrite: 'shift',
      },
    ],
  };
}

// No way with generics on `ControllerRenderProps<A, B>` to allow any property name, so overriding their type with missing differences
interface SubformType extends ControllerRenderProps<any, any> {
  value: number | null;
}

interface UseAmountInputProps {
  value: SubformType['value'];
  onAccept(newValue: SubformType['value']): void;
  signed?: boolean;
}

export function useAmountInput({ value, onAccept, signed }: UseAmountInputProps) {
  const mask = useMemo(() => AmountMaskFactory(i18n.language, signed), [signed]);

  const imaskOnAccept = useCallback<(value: InputMask<FactoryOpts>['value'], maskRef: InputMask<FactoryOpts>, e?: InputEvent) => void>(
    (maskedValue, mask, event) => {
      onAccept(parseFloat(mask.unmaskedValue)); // Needed since underlying it's managing string only
    },
    [onAccept]
  );

  const { ref: inputRef, setUnmaskedValue } = useIMask(mask, {
    onAccept: imaskOnAccept,
  });

  // The following is needed to synchronize "form state" into the masked input in case a `reset()` is used
  // TODO: there is a risk it does computation since modified on each typed character... don't know how to do it better for now
  useEffect(() => {
    // Passing an empty string as mask when null does not trigger the onAccept from `null` to empty string, which is good
    setUnmaskedValue(value !== null ? value.toString() : '');
  }, [value, setUnmaskedValue]);

  return { inputRef: inputRef };
}

interface AmountInputProps extends SubformType {
  label: string;
  signed?: boolean;
  errorMessage?: string;
}

export function AmountInput({ value, signed, label, disabled, errorMessage, onChange, onBlur }: AmountInputProps) {
  const onAccept = useCallback<UseAmountInputProps['onAccept']>(
    (newValue) => {
      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [onChange, value]
  );

  const { inputRef: maskInputRef } = useAmountInput({
    value: value,
    onAccept: onAccept,
    signed: signed,
  });

  return (
    <Input
      label={label}
      disabled={disabled}
      state={!!errorMessage ? 'error' : undefined}
      stateRelatedMessage={errorMessage}
      nativeInputProps={{
        ref: maskInputRef as Ref<HTMLInputElement> | undefined,
        placeholder: '0 €',
        onBlur: onBlur,
        onFocusCapture: (event) => {
          event.target.select(); // For the ease of modification select the whole on focus
        },
      }}
    />
  );
}
