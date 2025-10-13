'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input, InputProps } from '@codegouvfr/react-dsfr/Input';
import addressFormatter from '@fragaria/address-formatter';
import Autocomplete from '@mui/material/Autocomplete';
import debounce from 'lodash.debounce';
import { FocusEventHandler, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { BanAddress } from '@ad/src/client/national-address-base';
import { AddressInputSchemaType, AddressSchemaType } from '@ad/src/models/entities/address';
import { searchAddressSuggestions } from '@ad/src/proxies/national-address-base';

export interface AddressFieldProps {
  value?: Omit<AddressSchemaType, 'id'> | null;
  inputProps: Pick<InputProps, 'label' | 'nativeInputProps'>;
  onChange: (newValue: AddressInputSchemaType | null) => void;
  onBlur: FocusEventHandler<HTMLDivElement>;
  errorMessage?: string;
}

export function AddressField(props: PropsWithChildren<AddressFieldProps>) {
  const [searchAddressQuerySuggestions, setSearchAddressQuerySuggestions] = useState<BanAddress[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);

  // In the following region context can be ommitted because if coming from the value and not listed it won't be used
  // We provide it just for the Autocomplete component to take the right type without casting
  const adjustedValue = useMemo(() => (props.value ? { ...props.value, regionContext: '' } : null), [props.value]);

  const handleSearchAddressQueryChange = useCallback(
    async (query: string) => {
      try {
        setSuggestionsLoading(true);

        const suggestions = await searchAddressSuggestions(query);

        setSearchAddressQuerySuggestions(suggestions);
      } finally {
        setSuggestionsLoading(false);
      }
    },
    [setSuggestionsLoading]
  );

  const debouncedHandleAddressQuery = useMemo(() => debounce(handleSearchAddressQueryChange, 500), [handleSearchAddressQueryChange]);
  useEffect(() => {
    return () => {
      debouncedHandleAddressQuery.cancel();
    };
  }, [debouncedHandleAddressQuery]);

  return (
    <Autocomplete
      value={adjustedValue}
      options={searchAddressQuerySuggestions}
      renderInput={({ InputProps, disabled, id, inputProps }) => {
        // Unable to prevent the autocomplete for address from Chrome despite `autoComplete="false"` so giving up
        return (
          <Input
            {...props.inputProps}
            ref={InputProps.ref}
            id={id}
            disabled={disabled}
            state={!!props.errorMessage ? 'error' : undefined}
            stateRelatedMessage={props.errorMessage}
            nativeInputProps={{
              ...props.inputProps.nativeInputProps,
              ...inputProps,
            }}
          />
        );
      }}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;

        return (
          <li key={key} {...otherProps}>
            <div>
              <span className={fr.cx('fr-text--bold')}>{option.street}</span>
              <br />
              <span>
                {option.city} ({option.regionContext})
              </span>
            </div>
          </li>
        );
      }}
      isOptionEqualToValue={(option, value) => JSON.stringify(option) === JSON.stringify(value)} // Since it relies on object addresses we provide a hard way (no unique ID for addresses)
      getOptionLabel={(option) => {
        return addressFormatter
          .format({
            street: option.street,
            city: option.city,
            postcode: option.postalCode,
            state: option.subdivision,
            countryCode: option.countryCode,
          })
          .trim()
          .replace(/[\r\n]+/g, ' ');
      }}
      onInputChange={(event, newInputValue, reason) => {
        if (reason === 'input') {
          handleSearchAddressQueryChange(newInputValue);
        }
      }}
      onChange={(event, newValue) => {
        if (newValue) {
          const { regionContext, ...addressInput } = newValue;

          props.onChange(addressInput);
        } else {
          props.onChange(null);
        }
      }}
      onBlur={props.onBlur}
      loading={suggestionsLoading}
      selectOnFocus
      handleHomeEndKeys
      loadingText="Recherche en cours..."
      noOptionsText="Aucune suggestion d'adresse"
      fullWidth
    />
  );
}
