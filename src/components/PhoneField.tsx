import { Autocomplete, AutocompleteProps, InputBaseComponentProps } from '@mui/material';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material/TextField';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PhoneNumberUtil } from 'google-libphonenumber';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IMaskInput } from 'react-imask';
import { usePrevious } from 'react-use';

import { PhoneInputSchemaType, PhoneTypeSchema } from '@ad/src/models/entities/phone';
import { menuPaperProps } from '@ad/src/utils/menu';
import {
  CountryCallingCode,
  convertInputModelToGooglePhoneNumber,
  countryCallingCodes,
  getCountryCallingCode,
  getE164Number,
  transformPhoneNumberPlaceholderToMask,
} from '@ad/src/utils/phone';

const phoneNumberUtil = PhoneNumberUtil.getInstance();

function createCustomTextMaskInput(numberMask: string) {
  return React.forwardRef<HTMLInputElement, InputBaseComponentProps>(function TextMaskCustom(props, ref) {
    return (
      <IMaskInput
        {...props}
        mask={numberMask}
        definitions={{
          '#': /[0-9]/,
        }}
        inputRef={ref}
        overwrite
      />
    );
  });
}

export function getDefaultPhoneValue(): PhoneInputSchemaType {
  return {
    callingCode: '+33',
    countryCode: 'FR',
    number: '',
  };
}

// Set the PhoneField as customizable as TextField can be except for props we need
export interface PhoneFieldProps extends Omit<StandardTextFieldProps, 'value' | 'InputProps' | 'placeholder' | 'onChange'> {
  initialPhoneNumber?: PhoneInputSchemaType;
  numberOptions: string[];
  onGlobalChange: (phone: PhoneInputSchemaType) => void;
  onBlur: TextFieldProps['onBlur'];
}

export function PhoneField({ onGlobalChange, initialPhoneNumber, numberOptions, onBlur, ...props }: PhoneFieldProps) {
  const [countryCallingCode, setCountryCallingCode] = useState<CountryCallingCode>(countryCallingCodes[0]);
  const [numberFormattedValue, setNumberFormattedValue] = useState<string>('');
  const [initialPhoneNumberProcessedAtLeastOnce, setInitialPhoneNumberProcessedAtLeastOnce] = useState<boolean>(false);

  const prevCountryCallingCode = usePrevious(countryCallingCode);
  const prevNumberFormattedValue = usePrevious(numberFormattedValue);

  useEffect(() => {
    if (initialPhoneNumber && initialPhoneNumber.callingCode !== '' && initialPhoneNumber.countryCode !== '' && initialPhoneNumber.number !== '') {
      const countryCallingCode = getCountryCallingCode(initialPhoneNumber.callingCode, initialPhoneNumber.countryCode);
      if (countryCallingCode) {
        // Format the phone as the national number into the form value "number" (to respect the mask to fill)
        const fullPhoneNumber = convertInputModelToGooglePhoneNumber(initialPhoneNumber);
        const initialFormattedNumber = phoneNumberUtil.formatInOriginalFormat(fullPhoneNumber);

        setCountryCallingCode(countryCallingCode);
        setNumberFormattedValue(initialFormattedNumber);
      }
    }

    setInitialPhoneNumberProcessedAtLeastOnce(true);
  }, [initialPhoneNumber]);

  useEffect(() => {
    // Do not notify the parent until the initial value has been processed at least once
    if (!initialPhoneNumberProcessedAtLeastOnce) {
      return;
    }

    // Only update if something has changed to prevent infinite rerender from parent
    if (countryCallingCode === prevCountryCallingCode && numberFormattedValue === prevNumberFormattedValue) {
      return;
    }

    let e164Number: string;

    try {
      const fullPhoneNumber = phoneNumberUtil.parse(numberFormattedValue, countryCallingCode.countryCode);
      e164Number = getE164Number(fullPhoneNumber);

      // Until the number is fully filled leading zeros could be persisted in the value making the right length of a number...
      // It's fine since at the validation time it would say the number is invalid.
    } catch (err) {
      // If not a valid phone number yet we still give something to the parent that looks like a number for debug
      // but we make sure it's fully invalid except in the case if was empty
      if (numberFormattedValue === '') {
        e164Number = '';
      } else {
        e164Number = `invalid-${numberFormattedValue.replace(/\D/g, '')}`;
      }
    }

    onGlobalChange({
      callingCode: countryCallingCode.id,
      countryCode: countryCallingCode.countryCode,
      number: e164Number,
    });
  }, [
    countryCallingCode,
    numberFormattedValue,
    initialPhoneNumberProcessedAtLeastOnce,
    prevCountryCallingCode,
    prevNumberFormattedValue,
    onGlobalChange,
  ]);

  const { CustomTextMask, numberPlaceholder } = useMemo(() => {
    // When changing the country calling code, reset the input UI
    const fullPhoneNumberExample = phoneNumberUtil.getExampleNumber(countryCallingCode.countryCode);

    // Note: the best thing would have been to display the "significant national number" instead of the "national number"
    // that can contain leading zero like for France. But no easy way to do it (seriously)... gave up, that's fine :)
    const numberPlaceholder = phoneNumberUtil.formatInOriginalFormat(fullPhoneNumberExample);

    const mask = transformPhoneNumberPlaceholderToMask(numberPlaceholder);
    const CustomTextMask = createCustomTextMaskInput(mask);

    return { CustomTextMask, numberPlaceholder };
  }, [countryCallingCode]);

  const formattedNumberOptions = useMemo((): string[] => {
    try {
      return numberOptions.map((number) => {
        return phoneNumberUtil.formatInOriginalFormat(phoneNumberUtil.parse(number, countryCallingCode.countryCode));
      });
    } catch (error) {
      // In case the data from the backend is invalid (low probability since validated first)
      console.error(error);

      return [];
    }
  }, [countryCallingCode.countryCode, numberOptions]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = useMemo(() => Boolean(anchorEl), [anchorEl]);
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    },
    [setAnchorEl]
  );
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  const handleChange = useCallback<NonNullable<AutocompleteProps<string, false, false, true>['onInputChange']>>(
    (event, newValue, reason) => {
      setNumberFormattedValue(newValue || '');
    },
    [setNumberFormattedValue]
  );

  const handleCountryCallingCodeChange = useCallback(
    (iCountryCallingCode: CountryCallingCode) => () => {
      setCountryCallingCode(iCountryCallingCode);
    },
    [setCountryCallingCode]
  );

  return (
    <>
      <Autocomplete
        options={formattedNumberOptions}
        freeSolo
        value={numberFormattedValue}
        onInputChange={handleChange}
        renderInput={(params) => {
          return (
            <TextField
              {...params}
              label="Téléphone"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    {params.InputProps.startAdornment}
                    <InputAdornment position="start" sx={{ alignItems: 'stretch' }}>
                      <>
                        <Button
                          onClick={handleClick}
                          aria-label="options"
                          aria-controls={open ? 'phone-calling-code-menu' : undefined}
                          aria-haspopup="true"
                          aria-expanded={open ? 'true' : undefined}
                          startIcon={
                            <Typography component="span" sx={{ fontSize: 24 }}>
                              {countryCallingCode.flag}
                            </Typography>
                          }
                        >
                          {countryCallingCode.id}
                        </Button>
                        <Divider orientation="vertical" sx={{ height: 'auto', mx: 2 }} />
                      </>
                    </InputAdornment>
                  </>
                ),
                inputComponent: CustomTextMask,
              }}
              placeholder={numberPlaceholder}
              {...props}
            />
          );
        }}
        renderOption={(props, option) => {
          // Just needed for the Sentry mask
          return (
            <li {...props} key={option} data-sentry-mask>
              {option}
            </li>
          );
        }}
      />
      <Menu
        anchorEl={anchorEl}
        id="phone-calling-code-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          ...menuPaperProps,
          sx: {
            ...menuPaperProps.sx,
            maxHeight: '50vh',
            overflow: 'auto',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {countryCallingCodes.map((iCountryCallingCode) => {
          return (
            <MenuItem
              key={iCountryCallingCode.uniqueId}
              selected={iCountryCallingCode === countryCallingCode}
              onClick={handleCountryCallingCodeChange(iCountryCallingCode)}
            >
              <ListItemIcon sx={{ fontSize: 24 }}>{iCountryCallingCode.flag}</ListItemIcon>
              {iCountryCallingCode.countryName}
              <Typography component="span" variant="overline" sx={{ ml: 1 }}>
                ({iCountryCallingCode.id})
              </Typography>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
