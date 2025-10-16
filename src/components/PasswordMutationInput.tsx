import { PasswordInput, PasswordInputProps } from '@codegouvfr/react-dsfr/blocks/PasswordInput';
import { ChangeEventHandler, useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import {
  passwordRequiresANumericError,
  passwordRequiresASpecialCharactersError,
  passwordRequiresHeightCharactersError,
  passwordRequiresLowerAndUpperCharactersError,
} from '@ad/src/models/entities/errors';
import { UserPasswordSchema } from '@ad/src/models/entities/user';

export interface PasswordMutationInputProps extends Required<Pick<PasswordInputProps, 'label' | 'nativeInputProps'>> {
  valueToValidate?: string; // This in needed since `register()` from the parent and
  error?: string;
}

export function PasswordMutationInput({ label, error, nativeInputProps: { onChange, ...inputProps } }: PasswordMutationInputProps) {
  const [password, setPassword] = useState(inputProps.value || '');

  const customOnChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setPassword(event.target.value);

      onChange && onChange(event);
    },
    [onChange]
  );

  const messages = useMemo(() => {
    const values = {
      lengthValid: true,
      lowerUpperValid: true,
      numericValid: true,
      specialValid: true,
    };

    const result = UserPasswordSchema.safeParse(password);

    if (!result.success) {
      for (const issue of result.error.issues) {
        if (issue.code === 'custom' && issue.params?.type) {
          switch (issue.params.type) {
            case passwordRequiresANumericError.code:
              values.numericValid = false;
              break;
            case passwordRequiresHeightCharactersError.code:
              values.lengthValid = false;
              break;
            case passwordRequiresLowerAndUpperCharactersError.code:
              values.lowerUpperValid = false;
              break;
            case passwordRequiresASpecialCharactersError.code:
              values.specialValid = false;
              break;
          }
        }
      }
    }

    const list: PasswordInputProps['messages'] = [
      {
        severity: values.lengthValid ? 'valid' : 'info',
        message: 'au moins 8 caractères',
      },
      {
        severity: values.lowerUpperValid ? 'valid' : 'info',
        message: 'au moins une majuscule et une minuscule',
      },
      {
        severity: values.numericValid ? 'valid' : 'info',
        message: 'au moins un chiffre',
      },
      {
        severity: values.specialValid ? 'valid' : 'info',
        message: 'au moins un caractère spécial (@,!,?...)',
      },
    ];

    if (error) {
      list.push({
        severity: 'error',
        message: error,
      });
    }

    return list;
  }, [password, error]);

  return (
    <PasswordInput
      label={label}
      messages={messages}
      nativeInputProps={{
        ...inputProps,
        onChange: customOnChange,
      }}
    />
  );
}
