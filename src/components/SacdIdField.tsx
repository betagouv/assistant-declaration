import { FactoryOpts } from 'imask';
import { useEffect } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { useIMask } from 'react-imask';

// Can be used directly with `xxx.format(value)`
export const sacdIdMask: FactoryOpts = {
  mask: '0000000000',
  definitions: {
    '0': /[0-9]/,
  },
  overwrite: 'shift',
};

interface UseSacdIdInputProps extends Pick<ControllerRenderProps<any, string>, 'onChange'> {
  defaultValue: ControllerRenderProps<any, string>['value'];
}

export function useSacdIdInput({ defaultValue, onChange }: UseSacdIdInputProps) {
  const { ref: inputRef, setUnmaskedValue } = useIMask(sacdIdMask, {
    onAccept: (maskedValue, mask, event) => {
      onChange(mask.unmaskedValue);
    },
  });

  // The following is needed to synchronize "form state" into the masked input in case a `reset()` is used
  useEffect(() => {
    if (defaultValue != null) {
      setUnmaskedValue(defaultValue);
    }
  }, [defaultValue, setUnmaskedValue]);

  return { inputRef: inputRef };
}
