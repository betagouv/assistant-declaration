import { Autocomplete, TextField } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';

import { currentTaxRates } from '@ad/src/core/declaration';
import { RowForForm } from '@ad/src/utils/validation';

const taxRateOptions: number[] = currentTaxRates.map((taxRate) => {
  // Display a percentage tax rate so it's easier for people to understand
  const valueToDisplay = taxRate * 100;

  // Since it comes from an operation we make sure to round it before displaying the input
  return Math.round(valueToDisplay * 100) / 100;
});

export const TaxRateEditCell: NonNullable<GridColDef<RowForForm<{ taxRate: number | null }, any>>['renderEditCell']> = ({
  id,
  field,
  value,
  api,
}) => {
  // [WORKAROUND] SACD was mentioning the tax rate as nullable so we did it but without any use case for now compared to using `0`
  const safeValue = useMemo(() => (typeof value === 'number' ? value : 0), [value]);

  return (
    <Autocomplete
      options={taxRateOptions}
      freeSolo
      disableClearable
      value={safeValue}
      onInputChange={(event, newValue, reason) => {
        // From the number input it's a float, but it's a string when an option is selected due to being an option label (string)
        const safeNewValue = parseFloat(newValue);

        api.setEditCellValue({ id, field, value: safeNewValue }, event);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          type="number"
          inputProps={{
            // [WORKAROUND] We tried using the non-deprecated `slotProps.htmlInput.step` but it throws an error and
            //  `...params.slotProps.htmlInput` does not exist, so using the old way until fix
            // Old ref: https://github.com/mui/material-ui/issues/28687
            ...params.inputProps,
            step: 1, // Force the number to be an integer (not a float)
          }}
          onWheel={(event) => {
            // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

            // `event.currentTarget` is a callable type but is targetting the MUI element
            // whereas `event.target` targets the input element but does not have the callable type, so casting
            (event.target as HTMLInputElement).blur();
          }}
          fullWidth
        />
      )}
      renderOption={(props, option) => {
        // Needed because using `getOptionLabel` to formatting with locale and percentage would also be set into
        // the number input... The workaround is to use `getOptionLabel` as "float string" to parse them after no matter the locale
        return (
          <li {...props} key={option}>
            {option}%
          </li>
        );
      }}
      getOptionLabel={(option) => {
        // Has to be a string (so we parse it when an option is selected)
        return option.toString();
      }}
      filterOptions={(x) => x} // Always return full options
      sx={{
        // `Autocomplete` has double borders due to `TextField`, we wanted to use `InputBase` but it was breaking items so we ended patching the CSS
        // Ref: https://stackoverflow.com/questions/79374017/any-way-to-use-inputbase-with-autocomplete-with-multiple-items
        '& fieldset': { border: 'none' },
        // It also does not respect the CSS style due to `TextField` (as done for hardcoded GridEditInputCellRoot, but here we only patch what we need for simplicity)
        '& input': { fontSize: '0.875rem' },
      }}
      fullWidth
    />
  );
};
