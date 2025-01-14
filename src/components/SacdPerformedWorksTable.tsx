import { Delete } from '@mui/icons-material';
import { Autocomplete, Box, Button, IconButton, InputBaseComponentProps, TextField, Typography } from '@mui/material';
import { GridAutosizeOptions, type GridColDef, useGridApiRef, useGridRootProps } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { formatDuration, formatISODuration } from 'date-fns';
import { parse, toSeconds } from 'iso8601-duration';
import debounce from 'lodash.debounce';
import { KeyboardEventHandler, forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Control, FieldErrors, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { IMask, IMaskInput } from 'react-imask';

import { ErrorCellWrapper } from '@ad/src/components/ErrorCellWrapper';
import styles from '@ad/src/components/ErrorCellWrapper.module.scss';
import { FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { SacdDeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { GridEditInputCellRoot, useUtilityClasses } from '@ad/src/utils/datagrid';
import { nameof } from '@ad/src/utils/typescript';
import { RowForForm } from '@ad/src/utils/validation';

const rowTypedNameof = nameof<RowForForm<any, any>>;
const entryTypedNameof = nameof<FillSacdDeclarationSchemaType['performedWorks'][0]>;

const DurationMaskInput = forwardRef<HTMLInputElement, InputBaseComponentProps>(function TextMaskCustom(props, ref) {
  return (
    <IMaskInput
      {...props}
      placeholder="1h23m45s"
      mask={[
        {
          mask: '0[0]s',
        },
        {
          mask: '0[0]m[0[0]s]',
        },
        {
          mask: '0[0][0]h[0[0]m[0[0]s]]',
        },
      ]}
      onAccept={(value, mask, event) => {
        props.onChange(event);
      }}
      blocks={
        {
          // [WARNING] Those are not working properly since for a mask `HhMmSs` it will always expect the hour to be 3 digits... despite forcing "1h"... so giving up with precise integers
          // H: {
          //   mask: IMask.MaskedRange,
          //   from: 0,
          //   to: 999,
          // },
          // M: {
          //   mask: IMask.MaskedRange,
          //   from: 0,
          //   to: 59,
          // },
          // S: {
          //   mask: IMask.MaskedRange,
          //   from: 0,
          //   to: 59,
          // },
        }
      }
      inputRef={ref}
      overwrite
    />
  );
});

export interface SacdPerformedWorksTableProps {
  control: Control<FillSacdDeclarationSchemaType, any>;
  placeholder: SacdDeclarationWrapperSchemaType['placeholder']['performedWorksOptions'];
  errors: FieldErrors<FillSacdDeclarationSchemaType>['performedWorks'];
}

export function SacdPerformedWorksTable({ control, placeholder, errors }: SacdPerformedWorksTableProps) {
  const { t } = useTranslation('common');

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'performedWorks',
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

  const CustomContributorsEditCell = useCallback<NonNullable<GridColDef<(typeof rowsWithErrorLogic)[0]>['renderEditCell']>>(
    ({ id, field, value, api }) => {
      // Note: it helped avoiding rerenders despite the linter warning
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback((event) => {
        // By default "enter" would validate a new item in the list but also exit the edit mode
        // So we make sure it exits only if no value has been submitted with "enter"
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.value !== '') {
          event.stopPropagation();
        }
      }, []);

      return (
        <Autocomplete
          multiple
          freeSolo
          value={value || []}
          onChange={(event, newValue) => {
            api.setEditCellValue({ id, field, value: newValue }, event);
          }}
          onBlur={(event) => {
            // For the experience, simulate a "enter press" when leaving the field
            // for people not used to combobox with chips :)
            if (event.target instanceof HTMLInputElement && event.target.value !== '') {
              const newValue: string[] = [...value, event.target.value];

              api.setEditCellValue({ id, field, value: newValue }, event);
            }
          }}
          options={placeholder.contributors}
          renderInput={(params) => <TextField {...params} />}
          onKeyDown={handleKeyDown}
          fullWidth
          sx={{
            // `Autocomplete` with `multiple=true` has double borders due to `TextField`, we wanted to use `InputBase` but it was breaking items so we ended patching the CSS
            // Ref: https://stackoverflow.com/questions/79374017/any-way-to-use-inputbase-with-autocomplete-with-multiple-items
            '& fieldset': { border: 'none' },
            // It also does not respect the CSS style due to `TextField` (as done for hardcoded GridEditInputCellRoot, but here we only patch what we need for simplicity)
            '& input': { fontSize: '0.875rem' },
          }}
        />
      );
    },
    [placeholder.contributors]
  );

  const CustomDurationSecondsEditCell = useCallback<NonNullable<GridColDef<(typeof rowsWithErrorLogic)[0]>['renderEditCell']>>(
    ({ id, field, value, api }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const rootProps = useGridRootProps();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const classes = useUtilityClasses(rootProps);

      // Note: it helped avoiding rerenders despite the linter warning
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const formattedValue = useMemo(() => {
        const seconds = Number(value);

        // If 0 we want to display the placeholder, so returning an empty string
        if (seconds === 0) {
          return '';
        }

        const { h, m, s } = {
          h: Math.floor(seconds / 3600),
          m: Math.floor((seconds % 3600) / 60),
          s: Math.floor((seconds % 3600) % 60),
        };

        // The leading zeros are needed despite setting them as optional for the mask... the library shiftes the value otherwise
        // Note: the show all magnitudes to be sure the user has a sense of what is needed
        const finalValue = `${h}h${m < 10 ? `0${m}` : m}m${s < 10 ? `0${s}` : s}s`;

        return finalValue;
      }, [value]);

      return (
        <GridEditInputCellRoot
          ownerState={rootProps}
          className={classes.root}
          defaultValue={formattedValue}
          inputComponent={DurationMaskInput}
          onChange={(event) => {
            api.setEditCellValue({ id, field, value: event.target.value }, event);
          }}
          fullWidth
        />
      );
    },
    []
  );

  // To type options functions have a look at https://github.com/mui/mui-x/pull/4064
  const [columns] = useState<GridColDef<(typeof rowsWithErrorLogic)[0]>[]>([
    {
      field: `${rowTypedNameof('data')}.${entryTypedNameof('category')}`,
      headerName: 'Discipline',
      editable: true,
      display: 'flex', // Needed to align properly `ErrorCellWrapper`
      valueGetter: (_, row) => {
        return row.data.category;
      },
      valueSetter: (value, row) => {
        return {
          ...row,
          data: {
            ...row.data,
            category: value,
          },
        };
      },
      renderCell: (params) => {
        return (
          <ErrorCellWrapper errorMessage={params.row.errors?.category?.message} data-sentry-mask>
            {params.row.data.category}
          </ErrorCellWrapper>
        );
      },
    },
    {
      field: `${rowTypedNameof('data')}.${entryTypedNameof('name')}`,
      headerName: 'Titre',
      editable: true,
      display: 'flex', // Needed to align properly `ErrorCellWrapper`
      valueGetter: (_, row) => {
        return row.data.name;
      },
      valueSetter: (value, row) => {
        return {
          ...row,
          data: {
            ...row.data,
            name: value,
          },
        };
      },
      renderCell: (params) => {
        return (
          <ErrorCellWrapper errorMessage={params.row.errors?.name?.message} data-sentry-mask>
            {params.row.data.name}
          </ErrorCellWrapper>
        );
      },
    },
    {
      field: `${rowTypedNameof('data')}.${entryTypedNameof('contributors')}`,
      headerName: 'Contributeurs',
      editable: true,
      display: 'flex', // Needed to align properly `ErrorCellWrapper`
      maxWidth: 350, // We cannot set a percentage of the parent just using an approximate value for now
      valueGetter: (_, row) => {
        return row.data.contributors;
      },
      valueSetter: (value, row) => {
        return {
          ...row,
          data: {
            ...row.data,
            contributors: value,
          },
        };
      },
      renderCell: (params) => {
        return (
          <ErrorCellWrapper errorMessage={params.row.errors?.contributors?.message} data-sentry-mask>
            <Box
              sx={{
                textWrap: 'auto',
                my: 2, // Since it's high probably multilines we make just with the autosize it won't stick to borders
              }}
            >
              {params.row.data.contributors.join(', ')}
            </Box>
          </ErrorCellWrapper>
        );
      },
      renderEditCell: (params) => <CustomContributorsEditCell {...params} />,
    },
    {
      field: `${rowTypedNameof('data')}.${entryTypedNameof('durationSeconds')}`,
      headerName: 'Durée',
      editable: true,
      display: 'flex', // Needed to align properly `ErrorCellWrapper`
      valueGetter: (_, row) => {
        return row.data.durationSeconds;
      },
      valueSetter: (value, row) => {
        // If the value is valid, we update the row
        // Note: here we have no logic for explicit error message, we have to make sure the automated UI logic will always produce right values
        // Note: for any obscure reason this callback is called a lot of times for nothing when entering the edit mode so we need a specific condition on type
        if (typeof value === 'string') {
          try {
            const seconds = toSeconds(parse(`PT${value.toUpperCase()}`));

            return {
              ...row,
              data: {
                ...row.data,
                durationSeconds: seconds,
              },
            };
          } catch (error) {
            // Silent error
          }
        }

        return row;
      },
      renderCell: (params) => {
        const seconds = Number(params.row.data.durationSeconds);
        const { h, m, s } = {
          h: Math.floor(seconds / 3600),
          m: Math.floor((seconds % 3600) / 60),
          s: Math.floor((seconds % 3600) % 60),
        };

        return (
          <ErrorCellWrapper errorMessage={params.row.errors?.durationSeconds?.message} data-sentry-mask>
            {formatDuration({ hours: h, minutes: m, seconds: s })}
          </ErrorCellWrapper>
        );
      },
      renderEditCell: (params) => <CustomDurationSecondsEditCell {...params} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      headerAlign: 'right',
      display: 'flex', // Needed to align correctly with row height to `auto`
      align: 'right',
      sortable: false,
      renderCell: (params) => {
        return (
          <IconButton
            aria-label="enlever une œuvre représentée"
            onClick={() => {
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
        getRowId={(row) => `${row.data.category}_${row.data.name}`}
        getRowHeight={() => 'auto'}
        columns={columns}
        editMode="row"
        isCellEditable={(params) => {
          return true;
        }}
        processRowUpdate={(newRow, oldRow, params) => {
          // If the name has been changed we need to make sure it does not exist already to keep the uniqueness of fields
          if (newRow.data.name !== oldRow.data.name) {
            while (true) {
              const anotherRowWithThisLabel = fields.find((item) => {
                return item !== fields[newRow.index] && item.category === newRow.data.category && item.name === newRow.data.name;
              });

              if (anotherRowWithThisLabel) {
                // Renaming since that's the easiest solution here...
                newRow.data.name = `${newRow.data.name} bis`;
              } else {
                break;
              }
            }
          }

          // We cannot pass `newRow.data` directly because it contains the `id` field from `useFieldArray()` that would make `isDirty` true no matter the situation
          const { id, ...newFormItemValue } = newRow.data;

          update(newRow.index, newFormItemValue);

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
        localeText={{
          noRowsLabel: 'Aucune œuvre renseignée',
        }}
        onRowEditStart={(params, event) => {
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
        aria-label="tableau des sommes versées"
        data-sentry-mask
        sx={{
          '& .MuiDataGrid-row .MuiDataGrid-cell': {
            // Since using `auto` as row height it does not respect the default aspect of 52px so forcing it
            minHeight: 52,
          },
        }}
      />
      {errors?.message && (
        <Typography color="error" variant="body2" aria-invalid sx={{ mt: 1, ml: 2 }}>
          {errors.message}
        </Typography>
      )}
      <Button
        onClick={() => {
          // Each row must have a unique key for DataGrid (implicitly a unique category precision for "other performedWorks")
          let name = `Œuvre représentée ${fields.length + 1}`;

          while (true) {
            const anotherRowWithThisLabel = fields.find((item) => {
              return item.name === name;
            });

            if (anotherRowWithThisLabel) {
              // Renaming since that's the easiest solution here...
              name = `${name} bis`;
            } else {
              break;
            }
          }

          append({
            category: '',
            name: name,
            contributors: [],
            durationSeconds: 0,
          });
        }}
        size="medium"
        variant="outlined"
        sx={{
          alignSelf: 'self-end',
          mt: 1,
        }}
      >
        Ajouter une œuvre représentée
      </Button>
    </Box>
  );
}
