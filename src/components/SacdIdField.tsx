import { Input } from '@codegouvfr/react-dsfr/Input';
import { Ref, useEffect } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { useIMask } from 'react-imask';

import { sacdIdMask } from '@ad/src/utils/imask';

// No way with generics on `ControllerRenderProps<A, B>` to allow any property name, so overriding their type with missing differences
interface SubformType extends ControllerRenderProps<any, any> {
  value: string | null;
}

interface UseSacdIdInputProps extends Pick<SubformType, 'onChange'> {
  defaultValue: SubformType['value'];
}

export function useSacdIdInput({ defaultValue, onChange }: UseSacdIdInputProps) {
  const { ref: inputRef, setUnmaskedValue } = useIMask(sacdIdMask, {
    onAccept: (maskedValue, mask, event) => {
      onChange(mask.unmaskedValue);
    },
  });

  // The following is needed to synchronize "form state" into the masked input in case a `reset()` is used
  useEffect(() => {
    // Passing an empty string as mask when null does not trigger the onChange from `null` to empty string, which is good
    setUnmaskedValue(defaultValue ?? '');
  }, [defaultValue, setUnmaskedValue]);

  return { inputRef: inputRef };
}

interface SacdIdInputProps extends SubformType {
  label: string;
  errorMessage?: string;
}

export function SacdIdInput(props: SacdIdInputProps) {
  const { inputRef: maskInputRef } = useSacdIdInput({
    defaultValue: props.value,
    onChange: props.onChange,
  });

  return (
    <Input
      label={props.label}
      disabled={props.disabled}
      state={!!props.errorMessage ? 'error' : undefined}
      stateRelatedMessage={props.errorMessage}
      nativeInputProps={{
        ref: maskInputRef as Ref<HTMLInputElement> | undefined,
        placeholder: '000000',
        onChange: props.onChange,
        onBlur: props.onBlur,
      }}
    />
  );
}
