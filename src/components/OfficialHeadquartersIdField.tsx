import { Input } from '@codegouvfr/react-dsfr/Input';
import { Ref, useEffect } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { useIMask } from 'react-imask';

import { officialHeadquartersIdMask } from '@ad/src/utils/imask';

// No way with generics on `ControllerRenderProps<A, B>` to allow any property name, so overriding their type with missing differences
interface SubformType extends ControllerRenderProps<any, any> {
  value: string | null;
}

interface UseOfficialHeadquartersIdInputProps extends Pick<SubformType, 'onChange'> {
  defaultValue: SubformType['value'];
}

export function useOfficialHeadquartersIdInput({ defaultValue, onChange }: UseOfficialHeadquartersIdInputProps) {
  const { ref: inputRef, setUnmaskedValue } = useIMask(officialHeadquartersIdMask, {
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

interface OfficialHeadquartersIdInputProps extends SubformType {
  label: string;
  errorMessage?: string;
}

export function OfficialHeadquartersIdInput(props: OfficialHeadquartersIdInputProps) {
  const { inputRef: maskInputRef } = useOfficialHeadquartersIdInput({
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
        placeholder: '111 222 333 00000',
        onChange: props.onChange,
        onBlur: props.onBlur,
      }}
    />
  );
}
