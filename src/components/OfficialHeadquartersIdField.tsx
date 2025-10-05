import { FactoryOpts } from 'imask';
import { useEffect } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { useIMask } from 'react-imask';

// Can be used directly with `xxx.format(value)`
export const officialHeadquartersIdMask: FactoryOpts = {
  mask: '000 000 000 00000',
  definitions: {
    '0': /[0-9]/,
  },
  overwrite: 'shift',
};

interface UseOfficialHeadquartersIdInputProps extends Pick<ControllerRenderProps<any, string>, 'onChange'> {
  defaultValue: ControllerRenderProps<any, string>['value'];
}

export function useOfficialHeadquartersIdInput({ defaultValue, onChange }: UseOfficialHeadquartersIdInputProps) {
  const { ref: inputRef, setUnmaskedValue } = useIMask(officialHeadquartersIdMask, {
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
