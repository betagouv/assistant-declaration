import { ContentCopy } from '@mui/icons-material';
import { IconButton, InputAdornment, StandardTextFieldProps, TextField, Tooltip } from '@mui/material';
import { useCallback, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

export interface CopiableFieldProps extends Omit<StandardTextFieldProps, 'value' | 'InputProps' | 'slotProps'> {
  value: string;
  copyAriaLabel?: string;
}

export function CopiableField({ ...props }: CopiableFieldProps) {
  const [displayTooltip, setDisplayTooltip] = useState<boolean>(false);
  const debouncedSetDisplayTooltip = useDebounceCallback(setDisplayTooltip, 1500);

  const copyValue = useCallback(async () => {
    await navigator.clipboard.writeText(props.value);

    setDisplayTooltip(true);

    // Not an issue if the copy button is clicked multiple times
    debouncedSetDisplayTooltip(false);
  }, [setDisplayTooltip, debouncedSetDisplayTooltip, props.value]);

  return (
    <>
      <TextField
        {...props}
        slotProps={{
          htmlInput: {
            readOnly: true,
          },
        }}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Copié !" open={displayTooltip} disableFocusListener disableHoverListener disableTouchListener>
                <IconButton aria-label={props.copyAriaLabel ?? `copier la valeur`} onClick={copyValue}>
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    </>
  );
}
