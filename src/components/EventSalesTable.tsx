import { Alert, Snackbar, Tooltip } from '@mui/material';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { useCallback, useState } from 'react';

import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import styles from '@ad/src/components/EventSalesTable.module.scss';
import {
  EventCategoryTicketsSchemaType,
  EventWrapperSchemaType,
  SalesWrapperSchemaType,
  TicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import { currencyFormatter } from '@ad/src/utils/currency';
import { nameof } from '@ad/src/utils/typescript';

const salesTypedNameof = nameof<SalesWrapperSchemaType>;
const eventCategoryTicketsTypedNameof = nameof<EventCategoryTicketsSchemaType>;
const ticketCategoryTypedNameof = nameof<TicketCategorySchemaType>;

export interface EventSalesTableProps {
  wrapper: EventWrapperSchemaType;
  onRowUpdate: (updatedRow: SalesWrapperSchemaType) => Promise<void>;
}

export function EventSalesTable({ wrapper, onRowUpdate }: EventSalesTableProps) {
  // To type options functions have a look at https://github.com/mui/mui-x/pull/4064
  const columns: GridColDef<SalesWrapperSchemaType>[] = [
    {
      field: `${salesTypedNameof('ticketCategory')}.${ticketCategoryTypedNameof('name')}`,
      headerName: 'Catégorie des tickets',
      flex: 1.5,
      valueGetter: (_, row) => {
        return row.ticketCategory.name;
      },
    },
    {
      field: `${salesTypedNameof('eventCategoryTickets')}.${ticketCategoryTypedNameof('price')}`,
      headerName: 'Prix unitaire TTC',
      flex: 1,
      editable: true,
      type: 'number',
      valueGetter: (_, row) => {
        return row.eventCategoryTickets.priceOverride ?? row.ticketCategory.price;
      },
      valueSetter: (value, row) => {
        // Deep copy needed to have separated `newRow/oldRow`
        return {
          ...row,
          eventCategoryTickets: {
            ...row.eventCategoryTickets,
            priceOverride: value,
          },
          ticketCategory: {
            ...row.ticketCategory,
          },
        };
      },
      renderCell: (params) => {
        if (params.row.eventCategoryTickets.priceOverride !== null) {
          return (
            <Tooltip title={`Le prix remonté par la billetterie était de ${currencyFormatter.format(params.row.ticketCategory.price)}`}>
              <span>{currencyFormatter.format(params.row.eventCategoryTickets.priceOverride)}</span>
            </Tooltip>
          );
        } else {
          return `${currencyFormatter.format(params.row.ticketCategory.price)}`;
        }
      },
      cellClassName: (params) => {
        return params.row.eventCategoryTickets.priceOverride !== null ? styles.overridenCell : '';
      },
    },
    {
      field: `${salesTypedNameof('eventCategoryTickets')}.${eventCategoryTicketsTypedNameof('total')}`,
      headerName: 'Nombre de billets vendus',
      flex: 1,
      editable: true,
      type: 'number',
      valueGetter: (_, row) => {
        return row.eventCategoryTickets.totalOverride ?? row.eventCategoryTickets.total;
      },
      valueSetter: (value, row) => {
        // Deep copy needed to have separated `newRow/oldRow`
        return {
          ...row,
          eventCategoryTickets: {
            ...row.eventCategoryTickets,
            totalOverride: value,
          },
          ticketCategory: {
            ...row.ticketCategory,
          },
        };
      },
      renderCell: (params) => {
        if (params.row.eventCategoryTickets.totalOverride !== null) {
          return (
            <Tooltip title={`Le nombre de places remonté par la billetterie était de ${params.row.eventCategoryTickets.total}`}>
              <span>{params.row.eventCategoryTickets.totalOverride}</span>
            </Tooltip>
          );
        } else {
          return params.row.eventCategoryTickets.total;
        }
      },
      cellClassName: (params) => {
        return params.row.eventCategoryTickets.totalOverride !== null ? styles.overridenCell : '';
      },
    },
  ];

  const [snackbarAlert, setSnackbarAlert] = useState<JSX.Element | null>(null);
  const handleCloseSnackbar = useCallback(() => setSnackbarAlert(null), []);

  const processRowUpdate = useCallback(
    async (newRow: GridRowModel<SalesWrapperSchemaType>, oldRow: GridRowModel<SalesWrapperSchemaType>, params: unknown) => {
      // If no modification while exiting the edit mode, we don't consider having a useless override property (due to people testing clicking without any intent)
      if (
        newRow.eventCategoryTickets.priceOverride === oldRow.eventCategoryTickets.priceOverride &&
        newRow.eventCategoryTickets.totalOverride === oldRow.eventCategoryTickets.totalOverride
      ) {
        return oldRow;
      }

      // If failing it will be caught by MUI to trigger the other callback
      await onRowUpdate(newRow);

      setSnackbarAlert(
        <Alert severity="success" onClose={handleCloseSnackbar}>
          La modification a été enregistrée
        </Alert>
      );

      return newRow;
    },
    [onRowUpdate, handleCloseSnackbar]
  );

  const handleProcessRowUpdateError = useCallback(
    (error: Error) => {
      // [WORKAROUND] Wrapping the custom alert here is needed to probably missing properties on `ErrorAlert` component
      // (we tried using a `forwardRef` on the definition but it was not enough, so using a native wrapper is the easiest solution)
      // Ref: https://github.com/mui/material-ui/issues/28918#issuecomment-1106820571
      setSnackbarAlert(
        <div>
          <ErrorAlert errors={[error]} onClose={handleCloseSnackbar} />
        </div>
      );
    },
    [handleCloseSnackbar]
  );

  return (
    <>
      <DataGrid
        rows={wrapper.sales}
        getRowId={(row) => row.ticketCategory.id}
        columns={columns}
        hideFooter={true}
        disableColumnFilter
        disableColumnMenu
        disableRowSelectionOnClick
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={handleProcessRowUpdateError}
        aria-label="tableau des ventes d'une représentation"
        data-sentry-mask
      />
      {!!snackbarAlert && (
        <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
          {snackbarAlert}
        </Snackbar>
      )}
    </>
  );
}
