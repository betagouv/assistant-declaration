import { InputBaseComponentProps } from '@mui/material';
import { forwardRef } from 'react';
import { IMaskInput } from 'react-imask';

export interface CreateOfficialIdMaskInputProps {
  onAccept: (unmaskedValue: string) => void;
}

export function createOfficialIdMaskInput({ onAccept }: CreateOfficialIdMaskInputProps) {
  return forwardRef<HTMLInputElement, InputBaseComponentProps>(function TextMaskOfficialId(props, ref) {
    return (
      <IMaskInput
        {...props}
        placeholder="111 222 333"
        mask="000 000 000"
        unmask={true} // Return the value without spaces from the mask
        definitions={{
          '0': /[0-9]/,
        }}
        onAccept={(unmaskedValue, mask, event) => {
          // Cannot use `props.onChange(event)` since it would take the current input value (with spaces...), not the one set and expected by `unmask`
          // So we had to use a custom callback to forward the unmasked value to the parent component
          onAccept(unmaskedValue);
        }}
        inputRef={ref}
        overwrite
      />
    );
  });
}
