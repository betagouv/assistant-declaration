import { Input } from '@codegouvfr/react-dsfr/Input';
import { FactoryOpts } from 'imask';
import { Ref, useEffect } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { useIMask } from 'react-imask';

// Can be used directly with `xxx.format(value)`
export const officialIdMask: FactoryOpts = {
  mask: '000 000 000',
  definitions: {
    '0': /[0-9]/,
  },
  overwrite: 'shift',
};

interface UseOfficialIdInputProps extends Pick<ControllerRenderProps<any, string>, 'onChange'> {
  defaultValue: ControllerRenderProps<any, string>['value'];
}

export function useOfficialIdInput({ defaultValue, onChange }: UseOfficialIdInputProps) {
  const { ref: inputRef, setUnmaskedValue } = useIMask(officialIdMask, {
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

interface OfficialIdInputProps extends ControllerRenderProps<any, string> {
  label: string;
  errorMessage?: string;
}

export function OfficialIdInput(props: OfficialIdInputProps) {
  const { inputRef: maskInputRef } = useOfficialIdInput({
    defaultValue: props.value,
    onChange: props.onChange,
  });

  return (
    <Input
      label={props.label}
      state={!!props.errorMessage ? 'error' : undefined}
      stateRelatedMessage={props.errorMessage}
      nativeInputProps={{
        ref: maskInputRef as Ref<HTMLInputElement> | undefined,
        placeholder: '111 222 333',
        onChange: props.onChange,
        onBlur: props.onBlur,
      }}
    />
  );
}
