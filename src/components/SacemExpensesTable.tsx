import { Delete } from '@mui/icons-material';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { GridAutosizeOptions, type GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useState } from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FillSacemDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { AccountingCategorySchema } from '@ad/src/models/entities/declaration';
import { currencyFormatter } from '@ad/src/utils/currency';
import { nameof } from '@ad/src/utils/typescript';

const entryTypedNameof = nameof<FillSacemDeclarationSchemaType['expenses'][0]>;

export interface SacemExpensesTableProps {
  control: Control<FillSacemDeclarationSchemaType, any>;
}

export function SacemExpensesTable({ control }: SacemExpensesTableProps) {
  const { t } = useTranslation('common');

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'expenses',
  });

  const apiRef = useGridApiRef();

  const [autosizeOption] = useState<GridAutosizeOptions>({
    includeOutliers: true,
    includeHeaders: true,
    outliersFactor: 1.5,
    expand: true,
  });

  useEffect(() => {
    apiRef.current.autosizeColumns(autosizeOption);
  }, [apiRef, fields, autosizeOption]);

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
  const [columns] = useState<GridColDef<(typeof fields)[0]>[]>([
    {
      field: `${entryTypedNameof('category')}`,
      headerName: 'Type de contrat',
      editable: true,
      valueGetter: (_, row) => {
        return row.categoryPrecision ?? row.category;
      },
      valueSetter: (value, row) => {
        // Editable category should only be for "other expenses"
        return {
          ...row,
          categoryPrecision: value,
        };
      },
      renderCell: (params) => {
        return (
          <span data-sentry-mask>{params.row.categoryPrecision ?? t(`model.sacemDeclaration.accountingCategory.enum.${params.row.category}`)}</span>
        );
      },
    },
    {
      field: `${entryTypedNameof('taxRate')}`,
      headerName: 'Taux de TVA',
      editable: true,
      type: 'number',
      valueGetter: (_, row) => {
        // Display a percentage tax rate so it's easier for people to understand
        return row.taxRate * 100;
      },
      valueSetter: (value, row) => {
        // As we choose to display a percentage, we switch back to the technical format
        return {
          ...row,
          taxRate: value / 100,
        };
      },
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              params.row.category === AccountingCategorySchema.Values.TICKETING ? 'Cette valeur provient initialement de votre billetterie' : null
            }
          >
            <span data-sentry-mask>{params.row.taxRate * 100}%</span>
          </Tooltip>
        );
      },
    },
    {
      field: `excludingTaxesAmount`,
      headerName: 'Recettes HT',
      type: 'number', // To respect the same alignment than others
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              params.row.category === AccountingCategorySchema.Values.TICKETING
                ? 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                : null
            }
          >
            <span data-sentry-mask>{currencyFormatter.format((1 - params.row.taxRate) * params.row.includingTaxesAmount)}</span>
          </Tooltip>
        );
      },
    },
    {
      field: `tvaAmount`,
      headerName: 'Montant de la TVA',
      type: 'number', // To respect the same alignment than others
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              params.row.category === AccountingCategorySchema.Values.TICKETING
                ? 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                : null
            }
          >
            <span data-sentry-mask>{currencyFormatter.format(params.row.taxRate * params.row.includingTaxesAmount)}</span>
          </Tooltip>
        );
      },
    },
    {
      field: `${entryTypedNameof('includingTaxesAmount')}`,
      headerName: 'Recettes TTC',
      editable: true,
      type: 'number',
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              params.row.category === AccountingCategorySchema.Values.TICKETING
                ? 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                : null
            }
          >
            <span data-sentry-mask>{currencyFormatter.format(params.row.includingTaxesAmount)}</span>
          </Tooltip>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      headerAlign: 'right',
      align: 'right',
      sortable: false,
      renderCell: (params) => {
        return (
          <IconButton
            disabled={params.row.category !== AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS}
            aria-label="enlever une ligne de dépense"
            onClick={() => {
              // [WORKAROUND] From here at start we were comparing to `fields` but it was keeping the old array values
              // We tried using a `useCallback` but it was not working, we ended using a `useMemo` for columns, it was working
              // but rerendering the whole table so it feeled laggy. Ending with this, since rows cannot be rearranged the indexes are matching with `fields`
              const itemIndex = params.api.getRowIndexRelativeToVisibleRows(params.id);

              if (itemIndex !== -1) {
                remove(itemIndex);
              }
            }}
            size="small"
          >
            <Delete />
          </IconButton>
        );
      },
    },
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <DataGrid
        apiRef={apiRef}
        rows={fields}
        getRowId={(row) => `${row.category}_${row.categoryPrecision || ''}`}
        columns={columns}
        editMode="row"
        isCellEditable={(params) => {
          if (params.field === entryTypedNameof('category') && params.row.category !== AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS) {
            // If not a custom expense the category field cannot be edited
            return false;
          }

          return true;
        }}
        processRowUpdate={(newRow, oldRow, extra) => {
          const itemIndex = fields.findIndex((item) => {
            // `extra.rowId` comes from DataGrid whereas `item.id` has been defined by `useFieldArray()`
            return extra.rowId === `${item.category}_${item.categoryPrecision || ''}`;
          });

          // If the category has been changed we need to make sure it does not exist already to keep the uniqueness of fields
          if (newRow.category === AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS && newRow.categoryPrecision !== oldRow.categoryPrecision) {
            while (true) {
              const anotherRowWithThisLabel = fields.find((item) => {
                return item !== fields[itemIndex] && item.category === newRow.category && item.categoryPrecision === newRow.categoryPrecision;
              });

              if (anotherRowWithThisLabel) {
                // Renaming since that's the easiest solution here...
                newRow.categoryPrecision = `${newRow.categoryPrecision} bis`;
              } else {
                break;
              }
            }
          }

          // We cannot pass `newRow` directly because it contains the `id` field from `useFieldArray()` that would make `isDirty` true no matter the situation
          const { id, ...newFormItemValue } = newRow;

          if (itemIndex !== -1) {
            update(itemIndex, newFormItemValue);
          }

          return newRow;
        }}
        hideFooter={true}
        disableColumnFilter
        disableColumnMenu
        disableRowSelectionOnClick
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
        aria-label="tableau des dépenses artistiques d'une série de représentations"
        data-sentry-mask
      />
      <Button
        onClick={async () => {
          // Each row must have a unique key for DataGrid (implicitly a unique category precision for "other expenses")
          let categoryPrecision = `${t(`model.sacemDeclaration.accountingCategory.enum.OTHER_ARTISTIC_CONTRACTS`)} ${
            fields.filter((row) => {
              return row.category === AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS;
            }).length + 1
          }`;

          while (true) {
            const anotherRowWithThisLabel = fields.find((item) => {
              return item.category === AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS && item.categoryPrecision === categoryPrecision;
            });

            if (anotherRowWithThisLabel) {
              // Renaming since that's the easiest solution here...
              categoryPrecision = `${categoryPrecision} bis`;
            } else {
              break;
            }
          }

          append({
            category: AccountingCategorySchema.Values.OTHER_ARTISTIC_CONTRACTS,
            categoryPrecision: categoryPrecision,
            taxRate: 0.2,
            includingTaxesAmount: 0,
          });
        }}
        size="medium"
        variant="outlined"
        sx={{
          alignSelf: 'self-end',
          mt: 1,
        }}
      >
        Ajouter une autre dépense
      </Button>
    </Box>
  );
}
