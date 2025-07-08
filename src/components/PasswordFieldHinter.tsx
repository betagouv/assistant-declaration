import { Grid, Typography } from '@mui/material';
import { useMemo } from 'react';
import { z } from 'zod';

import { PasswordFieldHinterItem } from '@ad/src/components/PasswordFieldHinterItem';
import {
  passwordRequiresANumericError,
  passwordRequiresASpecialCharactersError,
  passwordRequiresHeightCharactersError,
  passwordRequiresLowerAndUpperCharactersError,
} from '@ad/src/models/entities/errors';
import { UserPasswordSchema } from '@ad/src/models/entities/user';
import { ulComponentResetStyles } from '@ad/src/utils/grid';

export interface PasswordFieldHinterProps {
  password: string;
  headline?: string;
}

export function PasswordFieldHinter(props: PasswordFieldHinterProps) {
  const { lengthValid, lowerUpperValid, numericValid, specialValid } = useMemo(() => {
    const values = {
      lengthValid: true,
      lowerUpperValid: true,
      numericValid: true,
      specialValid: true,
    };

    const result = UserPasswordSchema.safeParse(props.password || '');

    if (result.success) {
      return values;
    }

    for (const issue of result.error.issues) {
      if (issue.code === z.ZodIssueCode.custom && issue.params?.type) {
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

    return values;
  }, [props.password]);

  return (
    <>
      <Typography component="div" variant="body2" sx={{ py: 2, px: 2 }}>
        {!!props.headline ? props.headline : 'Le mot de passe doit contenir :'}
        <Grid container component="ul" spacing={0.8} sx={{ ...ulComponentResetStyles, pl: 2, pt: 1 }}>
          <PasswordFieldHinterItem text={`au moins 8 caractères`} valid={lengthValid} />
          <PasswordFieldHinterItem text={`au moins une majuscule et une minuscule`} valid={lowerUpperValid} />
          <PasswordFieldHinterItem text={`au moins un chiffre`} valid={numericValid} />
          <PasswordFieldHinterItem text={`au moins un caractère spécial (@,!,?...)`} valid={specialValid} />
        </Grid>
      </Typography>
    </>
  );
}
