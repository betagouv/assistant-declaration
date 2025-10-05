'use client';

import { FactoryOpts, InputMask } from 'imask';
import { useCallback, useEffect, useState } from 'react';
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

interface UseAmountInputProps extends Pick<ControllerRenderProps<any, string>, 'onChange'> {
  defaultValue: ControllerRenderProps<any, string>['value'];
  signed?: boolean;
}

export function useAmountInput({ defaultValue, onChange, signed }: UseAmountInputProps) {
  const onAccept = useCallback<(value: InputMask<FactoryOpts>['value'], maskRef: InputMask<FactoryOpts>, e?: InputEvent) => void>(
    (maskedValue, mask, event) => {
      console.log('VALID');

      onChange(mask.unmaskedValue);
    },
    [onChange]
  );

  const [separators] = useState(() => getNumberSeparators(i18n.language));

  const { ref: inputRef, setUnmaskedValue } = useIMask(
    {
      mask: [
        { mask: '' },
        {
          mask: 'num €',
          lazy: false,
          blocks: {
            num: {
              mask: Number,
              signed: signed ?? true,
              scale: 2,
              thousandsSeparator: separators.group,
              radix: separators.decimal,
              mapToRadix: separators.decimal === ',' ? [','] : ['.'],
            },
          },
          overwrite: true,
        },
      ],
    },
    {
      onAccept: onAccept,
    }
  );

  // The following is needed to synchronize "form state" into the masked input in case a `reset()` is used
  useEffect(() => {
    if (defaultValue != null) {
      setUnmaskedValue(defaultValue);
    }
  }, [defaultValue, setUnmaskedValue]);

  return { inputRef: inputRef };
}
