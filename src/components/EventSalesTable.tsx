import { Alert, Snackbar, Tooltip } from '@mui/material';
import { GridAutosizeOptions, type GridColDef, type GridRowModel, useGridApiRef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import debounce from 'lodash.debounce';
import { KeyboardEventHandler, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import styles from '@ad/src/components/EventSalesTable.module.scss';
import { RowEditActionsCell } from '@ad/src/components/RowEditActionsCell';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import {
  EventCategoryTicketsSchemaType,
  EventWrapperSchemaType,
  SalesWrapperSchemaType,
  TicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import { nameof } from '@ad/src/utils/typescript';

const salesTypedNameof = nameof<SalesWrapperSchemaType>;
const eventCategoryTicketsTypedNameof = nameof<EventCategoryTicketsSchemaType>;
const ticketCategoryTypedNameof = nameof<TicketCategorySchemaType>;

export interface EventSalesTableProps {
  wrapper: EventWrapperSchemaType;
  onRowUpdate: (updatedRow: SalesWrapperSchemaType) => Promise<void>;
  readonly?: boolean;
}

export function EventSalesTable({ wrapper, onRowUpdate, readonly }: EventSalesTableProps) {
  const { t } = useTranslation('common');

  const apiRef = useGridApiRef();

  const [autosizeOption] = useState<GridAutosizeOptions>({
    includeOutliers: true,
    includeHeaders: true,
    outliersFactor: 1.5,
    expand: true,
  });

  useEffect(() => {
    apiRef.current.autosizeColumns(autosizeOption);
  }, [apiRef, wrapper.sales, autosizeOption]);

  useEffect(() => {
    // We also autosize when the frame is changing
    // Note: using `onResize` is triggered sometimes for internal DataGrid things so it's not relevent for us
    const update = debounce(() => {
      apiRef.current.autosizeColumns(autosizeOption);
    }, 50);

    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
    };
  }, [apiRef, autosizeOption]);

  // To type options functions have a look at https://github.com/mui/mui-x/pull/4064
  const [columns] = useState<GridColDef<SalesWrapperSchemaType>[]>([
    {
      field: `${salesTypedNameof('ticketCategory')}.${ticketCategoryTypedNameof('name')}`,
      headerName: 'Catégorie des tickets',
      renderCell: (params) => {
        return <span data-sentry-mask>{params.row.ticketCategory.name}</span>;
      },
    },
    {
      field: `${salesTypedNameof('eventCategoryTickets')}.${ticketCategoryTypedNameof('price')}`,
      headerName: 'Prix unitaire TTC',
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
            <Tooltip
              title={`Le prix remonté par la billetterie était de ${t('currency.amount', { amount: params.row.ticketCategory.price })}`}
              data-sentry-mask
            >
              <span data-sentry-mask>{t('currency.amount', { amount: params.row.eventCategoryTickets.priceOverride })}</span>
            </Tooltip>
          );
        } else {
          return `${t('currency.amount', { amount: params.row.ticketCategory.price })}`;
        }
      },
      cellClassName: (params) => {
        return params.row.eventCategoryTickets.priceOverride !== null ? styles.overridenCell : '';
      },
    },
    {
      field: `${salesTypedNameof('eventCategoryTickets')}.${eventCategoryTicketsTypedNameof('total')}`,
      headerName: 'Nombre de billets vendus',
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
            <Tooltip title={`Le nombre de places remonté par la billetterie était de ${params.row.eventCategoryTickets.total}`} data-sentry-mask>
              <span data-sentry-mask>
                {t('number.default', {
                  number: params.row.eventCategoryTickets.totalOverride,
                })}
              </span>
            </Tooltip>
          );
        } else {
          return t('number.default', {
            number: params.row.eventCategoryTickets.total,
          });
        }
      },
      cellClassName: (params) => {
        return params.row.eventCategoryTickets.totalOverride !== null ? styles.overridenCell : '';
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      headerAlign: 'right',
      align: 'right',
      sortable: false,
      renderCell: (params) => (
        <RowEditActionsCell
          {...params}
          editFieldToFocus={`${salesTypedNameof('eventCategoryTickets')}.${ticketCategoryTypedNameof('price')}`}
          submitAriaLabel={'soumettre les modifications de la catégorie'}
          cancelAriaLabel={'annuler les modifications de la catégorie'}
          editAriaLabel={'modifier la catégorie'}
          deleteAriaLabel={'enlever la catégorie'}
        />
      ),
    },
  ]);

  const [snackbarAlert, setSnackbarAlert] = useState<React.JSX.Element | null>(null);
  const handleCloseSnackbar = useCallback(() => setSnackbarAlert(null), []);

  const processRowUpdate = useCallback(
    async (newRow: GridRowModel<SalesWrapperSchemaType>, oldRow: GridRowModel<SalesWrapperSchemaType>, params: unknown) => {
      // The input will always return a number, so patching if needed the overriden value
      if (oldRow.eventCategoryTickets.priceOverride === null && newRow.eventCategoryTickets.priceOverride === newRow.ticketCategory.price) {
        newRow.eventCategoryTickets.priceOverride = null;
      }

      if (oldRow.eventCategoryTickets.totalOverride === null && newRow.eventCategoryTickets.totalOverride === newRow.eventCategoryTickets.total) {
        newRow.eventCategoryTickets.totalOverride = null;
      }

      // If no modification while exiting the edit mode, we prevent triggering an update (due to people testing clicking without any intent)
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

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      // When the grids are used into a modal, exiting the edit mode was also closing the modal, so we prevent it
      // Note: we only prevent the event if there is an edit mode active, otherwise it can be used to close the modal
      if (event.key === 'Escape' && Object.keys(apiRef.current.state.editRows).length > 0) {
        event.stopPropagation();
      }
    },
    [apiRef]
  );

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.setColumnVisibilityModel({
        actions: !readonly,
      });

      apiRef.current.autosizeColumns(autosizeOption);
    }
  }, [readonly, apiRef, autosizeOption]);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div onKeyDown={handleKeyDown}>
        <DataGrid
          apiRef={apiRef}
          rows={wrapper.sales}
          getRowId={(row) => row.ticketCategory.id}
          columns={columns}
          hideFooter={true}
          disableColumnFilter
          disableColumnMenu
          disableRowSelectionOnClick
          initialState={{
            columns: {
              columnVisibilityModel: {
                actions: !readonly,
              },
            },
          }}
          editMode="row"
          isCellEditable={readonly ? () => false : (params) => true}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={handleProcessRowUpdateError}
          onCellEditStart={(params, event) => {
            // [WORKAROUND] As for number inputs outside the datagrid, there is the native issue of scrolling making the value changing
            // So doing the same workaround to prevent scrolling when it is focused
            // Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204
            const editCellElement = event.target as HTMLDivElement;

            // At the time of the callback the input child is not yet created, so we have to wait for it
            // Note: it appears in a few cases it does not work the first time... maybe we should delay a bit the "observe"?
            const observer = new MutationObserver(() => {
              const editCellInputElement = editCellElement.querySelector('input[type="number"]');

              if (editCellInputElement) {
                observer.disconnect();

                // Note: no need to remove the listener since it will after the focus is released due to the cell input element being deleted by `DataGrid`
                editCellInputElement.addEventListener('wheel', (event) => {
                  (event.target as HTMLInputElement).blur();
                });
              }
            });

            // Start observing the cell element for child additions
            observer.observe(editCellElement, { childList: true, subtree: true });
          }}
          autosizeOnMount={true}
          autosizeOptions={autosizeOption}
          disableVirtualization={true}
          aria-label="tableau des ventes d'une représentation"
          data-sentry-mask
        />
        {!!snackbarAlert && (
          <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
            {snackbarAlert}
          </Snackbar>
        )}
      </div>
    </>
  );
}
