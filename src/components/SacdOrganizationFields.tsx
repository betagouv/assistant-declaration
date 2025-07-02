import { Autocomplete, Grid, TextField } from '@mui/material';
import { useMemo } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { PhoneField } from '@ad/src/components/PhoneField';
import { FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { SacdDeclarationOrganizationPlaceholderSchemaType } from '@ad/src/models/entities/declaration/sacd';

export interface SacdOrganizationFieldsProps<T extends 'organizer' | 'producer' | 'rightsFeesManager'> {
  control: Control<FillSacdDeclarationSchemaType, any>;
  organizationType: T;
  placeholder: SacdDeclarationOrganizationPlaceholderSchemaType;
  errors: FieldErrors<FillSacdDeclarationSchemaType>[T];
  readonly?: boolean;
}

export function SacdOrganizationFields<T extends 'organizer' | 'producer' | 'rightsFeesManager'>({
  control,
  organizationType,
  placeholder,
  errors,
  readonly,
}: SacdOrganizationFieldsProps<T>) {
  const { t } = useTranslation('common');

  return (
    <>
      <Grid item xs={12}>
        <Controller
          control={control}
          name={`${organizationType}.name`}
          defaultValue={'' as any} // Cast needed due to generic field name
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            return (
              <Autocomplete
                disabled={readonly}
                options={placeholder.name}
                freeSolo
                onBlur={onBlur}
                value={value}
                onInputChange={(event, newValue, reason) => {
                  onChange(newValue);
                }}
                renderInput={(params) => <TextField {...params} label="Nom" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />}
                renderOption={(props, option) => {
                  // Just needed for the Sentry mask
                  return (
                    <li {...props} key={option} data-sentry-mask>
                      {option}
                    </li>
                  );
                }}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Controller
          control={control}
          name={`${organizationType}.headquartersAddress.street`}
          defaultValue={'' as any} // Cast needed due to generic field name
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            return (
              <Autocomplete
                disabled={readonly}
                options={placeholder.headquartersAddress.street}
                freeSolo
                onBlur={onBlur}
                value={value}
                onInputChange={(event, newValue, reason) => {
                  onChange(newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Adresse" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                )}
                renderOption={(props, option) => {
                  // Just needed for the Sentry mask
                  return (
                    <li {...props} key={option} data-sentry-mask>
                      {option}
                    </li>
                  );
                }}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          control={control}
          name={`${organizationType}.headquartersAddress.postalCode`}
          defaultValue={'' as any} // Cast needed due to generic field name
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            return (
              <Autocomplete
                disabled={readonly}
                options={placeholder.headquartersAddress.postalCode}
                freeSolo
                onBlur={onBlur}
                value={value}
                onInputChange={(event, newValue, reason) => {
                  onChange(newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Code postal" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                )}
                renderOption={(props, option) => {
                  // Just needed for the Sentry mask
                  return (
                    <li {...props} key={option} data-sentry-mask>
                      {option}
                    </li>
                  );
                }}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          control={control}
          name={`${organizationType}.headquartersAddress.city`}
          defaultValue={'' as any} // Cast needed due to generic field name
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            return (
              <Autocomplete
                disabled={readonly}
                options={placeholder.headquartersAddress.city}
                freeSolo
                onBlur={onBlur}
                value={value}
                onInputChange={(event, newValue, reason) => {
                  onChange(newValue);
                }}
                renderInput={(params) => <TextField {...params} label="Ville" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />}
                renderOption={(props, option) => {
                  // Just needed for the Sentry mask
                  return (
                    <li {...props} key={option} data-sentry-mask>
                      {option}
                    </li>
                  );
                }}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Controller
          control={control}
          name={`${organizationType}.email`}
          defaultValue={'' as any} // Cast needed due to generic field name
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            return (
              <Autocomplete
                disabled={readonly}
                options={placeholder.email}
                freeSolo
                onBlur={onBlur}
                value={value}
                onInputChange={(event, newValue, reason) => {
                  onChange(newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} type="email" label="Email" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                )}
                renderOption={(props, option) => {
                  // Just needed for the Sentry mask
                  return (
                    <li {...props} key={option} data-sentry-mask>
                      {option}
                    </li>
                  );
                }}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Controller
          control={control}
          name={`${organizationType}.phone`}
          render={({ field: { onChange, onBlur, ref }, fieldState: { error }, formState }) => {
            // Note: the linter is complaining about the `useMemo` inside an underlying `useCallback` but for now we have no choice otherwise it rerenders too many times (`PhoneField` logic should probably be based on the Controller value)
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const defaultValue = useMemo(() => {
              return control._defaultValues[organizationType]?.phone &&
                control._defaultValues[organizationType].phone.callingCode &&
                control._defaultValues[organizationType].phone.countryCode &&
                control._defaultValues[organizationType].phone.number
                ? {
                    callingCode: control._defaultValues[organizationType].phone.callingCode,
                    countryCode: control._defaultValues[organizationType].phone.countryCode,
                    number: control._defaultValues[organizationType].phone.number,
                  }
                : undefined;

              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [control._defaultValues[organizationType]?.phone]);

            return (
              <PhoneField
                disabled={readonly}
                initialPhoneNumber={defaultValue}
                numberOptions={placeholder.phone.number}
                onGlobalChange={onChange}
                onBlur={onBlur}
                error={!!error}
                helperText={error?.message}
                fullWidth
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Controller
          control={control}
          name={`${organizationType}.officialHeadquartersId`}
          defaultValue={'' as any} // Cast needed due to generic field name
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            return (
              <Autocomplete
                disabled={readonly}
                options={placeholder.officialHeadquartersId}
                freeSolo
                onBlur={onBlur}
                value={value}
                onInputChange={(event, newValue, reason) => {
                  onChange(newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="N° Siret" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                )}
                renderOption={(props, option) => {
                  // Just needed for the Sentry mask
                  return (
                    <li {...props} key={option} data-sentry-mask>
                      {option}
                    </li>
                  );
                }}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Controller
          control={control}
          name={`${organizationType}.europeanVatId`}
          defaultValue={'' as any} // Cast needed due to generic field name
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            return (
              <Autocomplete
                disabled={readonly}
                options={placeholder.europeanVatId}
                freeSolo
                onBlur={onBlur}
                value={value}
                onInputChange={(event, newValue, reason) => {
                  onChange(newValue);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="N° TVA Intracommunautaire" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                )}
                renderOption={(props, option) => {
                  // Just needed for the Sentry mask
                  return (
                    <li {...props} key={option} data-sentry-mask>
                      {option}
                    </li>
                  );
                }}
              />
            );
          }}
        />
      </Grid>
    </>
  );
}
