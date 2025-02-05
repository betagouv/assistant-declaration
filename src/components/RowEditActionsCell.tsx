import { Clear, Delete, Done, Edit } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { ReactNode, useMemo } from 'react';

export interface RowEditActionsCellProps extends NonNullable<GridColDef<any, any>['renderCell']> {
  editFieldToFocus: string;
  onDelete?: () => void;
  notEditable?: boolean;
  submitAriaLabel?: string;
  cancelAriaLabel?: string;
  editAriaLabel?: string;
  deleteAriaLabel?: string;
}

export function RowEditActionsCell({
  id,
  api,
  editFieldToFocus,
  onDelete,
  notEditable,
  submitAriaLabel,
  cancelAriaLabel,
  editAriaLabel,
  deleteAriaLabel,
}: any): ReactNode {
  const rowBeingEdited: boolean = useMemo(() => {
    // We want the `useMemo` to react less frequently than with a direct `api.getRowMode(id)`
    return !!api.state.editRows[id];
  }, [api.state.editRows, id]);

  return (
    <>
      {rowBeingEdited ? (
        <>
          <IconButton
            aria-label={submitAriaLabel || `soumettre les modifications de la ligne`}
            onClick={() => {
              api.stopRowEditMode({
                id: id,
                ignoreModifications: false,
              });
            }}
            size="small"
          >
            <Done />
          </IconButton>
          <IconButton
            aria-label={cancelAriaLabel || `annuler les modifications de la ligne`}
            onClick={() => {
              api.stopRowEditMode({
                id: id,
                ignoreModifications: true,
              });
            }}
            size="small"
          >
            <Clear />
          </IconButton>
        </>
      ) : (
        <>
          <IconButton
            disabled={notEditable === true}
            aria-label={editAriaLabel || `modifier la ligne`}
            onClick={() => {
              api.startRowEditMode({
                id: id,
                fieldToFocus: editFieldToFocus,
              });
            }}
            size="small"
          >
            <Edit />
          </IconButton>
          <IconButton
            disabled={!onDelete}
            aria-label={deleteAriaLabel || `enlever la ligne`}
            onClick={() => {
              onDelete && onDelete();
            }}
            size="small"
          >
            <Delete />
          </IconButton>
        </>
      )}
    </>
  );
}
