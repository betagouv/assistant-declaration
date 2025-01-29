import { Autocomplete, TextField } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';

import { currentTaxRates } from '@ad/src/core/declaration';
import { RowForForm } from '@ad/src/utils/validation';

const taxRateOptions = currentTaxRates.map((taxRate) => {
  const valueToDisplay = taxRate * 100; // Display a percentage tax rate so it's easier for people to understand
  const safeValue = Math.round(valueToDisplay * 100) / 100; // Since it comes from an operation we make sure to round it before displaying the input

  return {
    value: safeValue,
    label: `${safeValue}%`,
  };
});

export const TaxRateEditCell: NonNullable<GridColDef<RowForForm<{ taxRate: number }, any>>['renderEditCell']> = ({ id, field, value, api }) => {
  return (
    <Autocomplete
      options={taxRateOptions}
      freeSolo
      filterOptions={(x) => x} // Always return all options
      disableClearable
      value={value || taxRateOptions[0]}
      onChange={(event, newValue, reason) => {
        console.log(22222222222);
        console.log(reason);
        console.log(newValue);
      }}
      onInputChange={(event, newValue, reason) => {
        const safeNewValue = parseInt(newValue, 10);

        console.log(33333333333);
        console.log(reason);
        console.log(newValue);
        // console.log(newValue);
        // console.log(safeNewValue);

        // console.log(typeof newValue);
        // if (typeof newValue === 'string') {
        //   console.log(1111111111111111111111111111);
        //   console.log(newValue);
        //   console.log(reason);

        //   return;
        // }

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
      // renderOption={(props, option) => {
      //   // Just needed for the Sentry mask
      //   return (
      //     <li {...props} key={option} data-sentry-mask>
      //       {option}%
      //     </li>
      //   );
      // }}
      getOptionLabel={(option) => {
        // console.log(11111111);
        // console.log(option);

        if (typeof option === 'number') {
          return option.toString();
        }

        return option.label;
      }}
      isOptionEqualToValue={(option, value) => {
        return option.value === value;
      }}
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
