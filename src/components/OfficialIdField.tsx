import { useEffect } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { useIMask } from 'react-imask';

interface UseOfficialIdInputProps extends Pick<ControllerRenderProps<any, string>, 'value' | 'onChange'> {}

export function useOfficialIdInput({ value, onChange }: UseOfficialIdInputProps) {
  const { ref: inputRef, setUnmaskedValue } = useIMask(
    {
      mask: '000 000 000',
      definitions: {
        '0': /[0-9]/,
      },
      overwrite: true,
    },
    {
      onAccept: (maskedValue, mask, event) => {
        onChange(mask.unmaskedValue);
      },
    }
  );

  // The following is needed to synchronize "form state" into the masked input
  // Note: despite the `onChange` bound to the `value` it won't be triggered in a loop when typing into the input
  useEffect(() => {
    if (value != null) {
      setUnmaskedValue(value);
    }
  }, [value, setUnmaskedValue]);

  return { inputRef: inputRef };
}
