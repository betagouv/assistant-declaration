import { Delete } from '@mui/icons-material';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { GridAutosizeOptions, type GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import debounce from 'lodash.debounce';
import { useEffect, useMemo, useState } from 'react';
import { Control, FieldErrors, UseFormTrigger, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ErrorCellWrapper } from '@ad/src/components/ErrorCellWrapper';
import styles from '@ad/src/components/ErrorCellWrapper.module.scss';
import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { FillSacemDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { AccountingCategorySchema } from '@ad/src/models/entities/declaration/sacem';
import { currencyFormatter } from '@ad/src/utils/currency';
import { nameof } from '@ad/src/utils/typescript';
import { RowForForm } from '@ad/src/utils/validation';

const rowTypedNameof = nameof<RowForForm<any, any>>;
const entryTypedNameof = nameof<FillSacemDeclarationSchemaType['revenues'][0]>;

export interface SacemRevenuesTableProps {
  control: Control<FillSacemDeclarationSchemaType, any>;
  trigger: UseFormTrigger<FillSacemDeclarationSchemaType>;
  errors: FieldErrors<FillSacemDeclarationSchemaType>['revenues'];
}

export function SacemRevenuesTable({ control, trigger, errors }: SacemRevenuesTableProps) {
  const { t } = useTranslation('common');

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'revenues',
  });

  const apiRef = useGridApiRef();

  const [autosizeOption] = useState<GridAutosizeOptions>({
    includeOutliers: true,
    includeHeaders: true,
    outliersFactor: 1.5,
    expand: true,
  });

  const rowsWithErrorLogic = useMemo(() => {
    return fields.map((field, index): RowForForm<typeof field, NonNullable<typeof errors>[0]> => {
      return {
        index: index,
        data: field,
        errors: Array.isArray(errors) ? errors[index] : undefined,
      };
    });
  }, [fields, errors]);

  useEffect(() => {
    apiRef.current.autosizeColumns(autosizeOption);
  }, [apiRef, rowsWithErrorLogic, autosizeOption]);

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
  const [columns] = useState<GridColDef<(typeof rowsWithErrorLogic)[0]>[]>([
    {
      field: `${rowTypedNameof('data')}.${entryTypedNameof('category')}`,
      headerName: 'Origine des recettes',
      editable: true,
      display: 'flex', // Needed to align properly `ErrorCellWrapper`
      valueGetter: (_, row) => {
        return row.data.categoryPrecision ?? row.data.category;
      },
      valueSetter: (value, row) => {
        // Editable category should only be for "other revenues"
        return {
          ...row,
          data: {
            ...row.data,
            categoryPrecision: value,
          },
        };
      },
      renderCell: (params) => {
        return (
          <ErrorCellWrapper errorMessage={params.row.errors?.category?.message ?? params.row.errors?.categoryPrecision?.message} data-sentry-mask>
            {params.row.data.categoryPrecision ?? t(`model.sacemDeclaration.accountingCategory.enum.${params.row.data.category}`)}
          </ErrorCellWrapper>
        );
      },
    },
    {
      field: `${rowTypedNameof('data')}.${entryTypedNameof('taxRate')}`,
      headerName: 'Taux de TVA',
      editable: true,
      type: 'number',
      display: 'flex', // Needed to align properly `ErrorCellWrapper`
      valueGetter: (_, row) => {
        // Display a percentage tax rate so it's easier for people to understand
        return row.data.taxRate * 100;
      },
      valueSetter: (value, row) => {
        // As we choose to display a percentage, we switch back to the technical format
        return {
          ...row,
          data: {
            ...row.data,
            taxRate: value / 100,
          },
        };
      },
      renderCell: (params) => {
        return (
          <ErrorCellWrapper errorMessage={params.row.errors?.taxRate?.message} data-sentry-mask>
            <Tooltip
              title={
                params.row.data.category === AccountingCategorySchema.Values.TICKETING
                  ? 'Cette valeur provient initialement de votre billetterie'
                  : null
              }
            >
              <span data-sentry-mask>{params.row.data.taxRate * 100}%</span>
            </Tooltip>
          </ErrorCellWrapper>
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
              params.row.data.category === AccountingCategorySchema.Values.TICKETING
                ? 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                : null
            }
          >
            <span data-sentry-mask>
              {currencyFormatter.format(
                getExcludingTaxesAmountFromIncludingTaxesAmount(params.row.data.includingTaxesAmount, params.row.data.taxRate)
              )}
            </span>
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
              params.row.data.category === AccountingCategorySchema.Values.TICKETING
                ? 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                : null
            }
          >
            <span data-sentry-mask>
              {currencyFormatter.format(getTaxAmountFromIncludingTaxesAmount(params.row.data.includingTaxesAmount, params.row.data.taxRate))}
            </span>
          </Tooltip>
        );
      },
    },
    {
      field: `${rowTypedNameof('data')}.${entryTypedNameof('includingTaxesAmount')}`,
      headerName: 'Recettes TTC',
      editable: true,
      type: 'number',
      display: 'flex', // Needed to align properly `ErrorCellWrapper`
      valueGetter: (_, row) => {
        return row.data.includingTaxesAmount;
      },
      valueSetter: (value, row) => {
        return {
          ...row,
          data: {
            ...row.data,
            includingTaxesAmount: value,
          },
        };
      },
      renderCell: (params) => {
        return (
          <ErrorCellWrapper errorMessage={params.row.errors?.includingTaxesAmount?.message} data-sentry-mask>
            <Tooltip
              title={
                params.row.data.category === AccountingCategorySchema.Values.TICKETING
                  ? 'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                  : null
              }
            >
              <span data-sentry-mask>{currencyFormatter.format(params.row.data.includingTaxesAmount)}</span>
            </Tooltip>
          </ErrorCellWrapper>
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
            disabled={params.row.data.category !== AccountingCategorySchema.Values.OTHER_REVENUES}
            aria-label="enlever une ligne de recette"
            onClick={() => {
              // Note: here `trigger` won't help since the visual error will disappear with the row, and an `BaseForm` error alert has no reason to change
              remove(params.row.index);
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
        rows={rowsWithErrorLogic}
        getRowId={(row) => `${row.data.category}_${row.data.categoryPrecision || ''}`}
        columns={columns}
        editMode="row"
        isCellEditable={(params) => {
          if (params.row.data.category === AccountingCategorySchema.Values.TICKETING) {
            // If it's for ticketing, the values are computed from other tables so it cannot be modified
            return false;
          } else if (
            params.field === `${rowTypedNameof('data')}.${entryTypedNameof('category')}` &&
            params.row.data.category !== AccountingCategorySchema.Values.OTHER_REVENUES
          ) {
            // If not a custom revenue the category field cannot be edited
            return false;
          }

          return true;
        }}
        processRowUpdate={(newRow, oldRow, params) => {
          // If the category has been changed we need to make sure it does not exist already to keep the uniqueness of fields
          if (
            newRow.data.category === AccountingCategorySchema.Values.OTHER_REVENUES &&
            newRow.data.categoryPrecision !== oldRow.data.categoryPrecision
          ) {
            while (true) {
              const anotherRowWithThisLabel = fields.find((item) => {
                return (
                  item !== fields[newRow.index] && item.category === newRow.data.category && item.categoryPrecision === newRow.data.categoryPrecision
                );
              });

              if (anotherRowWithThisLabel) {
                // Renaming since that's the easiest solution here...
                newRow.data.categoryPrecision = `${newRow.data.categoryPrecision} bis`;
              } else {
                break;
              }
            }
          }

          // We cannot pass `newRow.data` directly because it contains the `id` field from `useFieldArray()` that would make `isDirty` true no matter the situation
          const { id, ...newFormItemValue } = newRow.data;

          update(newRow.index, newFormItemValue);

          // To mimic the behavior from fields like `TextField`, we want the UI to adjust if the user has fixed an error
          if (newRow.errors) {
            trigger(`revenues.${newRow.index}`);
          }

          return newRow;
        }}
        getRowClassName={(params) => {
          return params.row.errors ? styles.erroredRow : '';
        }}
        className={errors?.message ? styles.erroredTable : ''}
        hideFooter={true}
        disableColumnFilter
        disableColumnMenu
        disableRowSelectionOnClick
        onRowEditStart={(params, event) => {
          // [WORKAROUND] As for number inputs outside the datagrid, there is the native issue of scrolling making the value changing
          // So doing the same workaround to prevent scrolling when it is focused
          // Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204
          const rowElement = apiRef.current.getRowElement(params.id);

          if (rowElement) {
            // At the time of the callback the input children are not yet created, so we have to wait for them
            // Note: it appears in a few cases it does not work the first time... maybe we should delay a bit the "observe"?
            const observer = new MutationObserver(() => {
              const editCellInputElements = rowElement.querySelectorAll('input[type="number"]');

              if (editCellInputElements.length > 0) {
                observer.disconnect();

                // Note: no need to remove the listener since it will after the focus is released due to the cell input element being deleted by `DataGrid`
                for (const inputElement of editCellInputElements) {
                  inputElement.addEventListener('wheel', (event) => {
                    (event.target as HTMLInputElement).blur();
                  });
                }
              }
            });

            // Start observing the cell element for child additions
            observer.observe(rowElement, { childList: true, subtree: true });
          }
        }}
        onRowEditStop={(params, event, details) => {
          // This is due to autocomplete with multiple selections that make since really large
          // Note: `details.api` is undefined for whatever reason so using our variable
          setTimeout(() => {
            apiRef.current.autosizeColumns(autosizeOption);
          }, 10);
        }}
        autosizeOnMount={true}
        autosizeOptions={autosizeOption}
        disableVirtualization={true}
        aria-label="tableau des recettes d'une série de représentations"
        data-sentry-mask
      />
      {errors?.message && (
        <Typography color="error" variant="body2" aria-invalid sx={{ mt: 1, ml: 2 }}>
          {errors.message}
        </Typography>
      )}
      <Button
        onClick={() => {
          // Each row must have a unique key for DataGrid (implicitly a unique category precision for "other revenues")
          let categoryPrecision = `${t(`model.sacemDeclaration.accountingCategory.enum.OTHER_REVENUES`)} ${
            fields.filter((row) => {
              return row.category === AccountingCategorySchema.Values.OTHER_REVENUES;
            }).length + 1
          }`;

          while (true) {
            const anotherRowWithThisLabel = fields.find((item) => {
              return item.category === AccountingCategorySchema.Values.OTHER_REVENUES && item.categoryPrecision === categoryPrecision;
            });

            if (anotherRowWithThisLabel) {
              // Renaming since that's the easiest solution here...
              categoryPrecision = `${categoryPrecision} bis`;
            } else {
              break;
            }
          }

          append({
            category: AccountingCategorySchema.Values.OTHER_REVENUES,
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
        Ajouter une autre recette
      </Button>
    </Box>
  );
}
