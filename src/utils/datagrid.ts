import { InputBase, styled } from '@mui/material';
import { unstable_composeClasses as composeClasses } from '@mui/utils';
import { getDataGridUtilityClass } from '@mui/x-data-grid';
import { DataGridProcessedProps } from '@mui/x-data-grid/internals';

//
// [WORKAROUND] Had to hardcode them here since not exported by MUI
// Ref: https://github.com/mui/mui-x/issues/16285
//

export type OwnerState = DataGridProcessedProps;

export const useUtilityClasses = (ownerState: OwnerState) => {
  const { classes } = ownerState;

  const slots = {
    root: ['editInputCell'],
  };

  return composeClasses(slots, getDataGridUtilityClass, classes);
};

export const GridEditInputCellRoot = styled(InputBase, {
  name: 'MuiDataGrid',
  slot: 'EditInputCell',
  overridesResolver: (props, styles) => styles.editInputCell,
})<{ ownerState: OwnerState }>(({ theme }) => ({
  ...theme.typography.body2,
  padding: '1px 0',
  '& input': {
    padding: '0 16px',
    height: '100%',
  },
}));
