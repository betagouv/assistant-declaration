'use client';

import { Error } from '@mui/icons-material';
import { Box, Tooltip } from '@mui/material';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { capitalizeFirstLetter } from '@ad/src/utils/format';

export interface ErrorCellWrapperProps {
  errorMessage?: string;
}

export function ErrorCellWrapper(props: PropsWithChildren<ErrorCellWrapperProps>) {
  const { t } = useTranslation('common');

  // Below the error has been translated already, it's not a code
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }} aria-invalid={!!props.errorMessage}>
      {props.children}
      {props.errorMessage && (
        <Tooltip title={capitalizeFirstLetter(props.errorMessage)}>
          <Error color="error" sx={{ ml: 1 }} />
        </Tooltip>
      )}
    </Box>
  );
}
