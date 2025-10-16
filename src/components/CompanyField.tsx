'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input, InputProps } from '@codegouvfr/react-dsfr/Input';
import Autocomplete from '@mui/material/Autocomplete';
import debounce from 'lodash.debounce';
import { FocusEventHandler, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { CompanySuggestion } from '@ad/src/client/api-gouv-fr';
import { officialIdMask } from '@ad/src/components/OfficialIdField';
import { searchCompanySuggestions } from '@ad/src/proxies/api-gouv-fr';
import { formatMaskedValue } from '@ad/src/utils/imask';

export interface Company {
  officialId: string;
  name: string;
}

export interface CompanyFieldProps {
  value?: Company | null;
  inputProps: Pick<InputProps, 'label' | 'nativeInputProps' | 'disabled'>;
  onChange: (newValue: Company | null) => void;
  onBlur: FocusEventHandler<HTMLDivElement>;
  defaultSuggestions?: Company[];
  errorMessage?: string;
}

export function CompanyField(props: PropsWithChildren<CompanyFieldProps>) {
  // In the following headquarters address and ID can be ommitted because if coming from the value and not listed it won't be used
  // We provide it just for the Autocomplete component to take the right type without casting
  const [defaultSuggestions] = useState<CompanySuggestion[]>(
    props.defaultSuggestions?.map((dS) => {
      return { ...dS, officialHeadquartersId: '', inlineHeadquartersAddress: '' };
    }) ?? []
  );
  const [searchCompanyQuerySuggestions, setSearchCompanyQuerySuggestions] = useState<CompanySuggestion[]>(defaultSuggestions);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);

  const adjustedValue = useMemo(
    () => (props.value ? { ...props.value, officialHeadquartersId: '', inlineHeadquartersAddress: '' } : null),
    [props.value]
  );
  const [inputValue, setInputValue] = useState('');

  const handleSearchCompanyQueryChange = useCallback(
    async (query: string) => {
      if (query !== '') {
        try {
          setSuggestionsLoading(true);

          const suggestions = await searchCompanySuggestions(query);

          setSearchCompanyQuerySuggestions(suggestions);
        } finally {
          setSuggestionsLoading(false);
        }
      } else {
        // When there is no input value, we make sure to at least propose initial suggestions to help the user
        setSearchCompanyQuerySuggestions(defaultSuggestions);
      }
    },
    [setSuggestionsLoading, defaultSuggestions]
  );

  const debouncedHandleCompanyQuery = useMemo(() => debounce(handleSearchCompanyQueryChange, 500), [handleSearchCompanyQueryChange]);
  useEffect(() => {
    return () => {
      debouncedHandleCompanyQuery.cancel();
    };
  }, [debouncedHandleCompanyQuery]);

  return (
    <Autocomplete
      value={adjustedValue}
      inputValue={inputValue}
      options={searchCompanyQuerySuggestions}
      filterOptions={(options, state) => options} // We want to show results from the API without any additional filtering from MUI
      renderInput={({ InputProps, id, inputProps }) => {
        return (
          <Input
            {...props.inputProps}
            ref={InputProps.ref}
            id={id}
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
              <span className={fr.cx('fr-text--bold')}>{option.name}</span>
              &nbsp;
              <span style={{ fontStyle: 'italic' }}>(SIREN {formatMaskedValue(officialIdMask, option.officialId)})</span>
              <br />
              <span>{option.inlineHeadquartersAddress}</span>
            </div>
          </li>
        );
      }}
      getOptionLabel={(option) => {
        return `${option.name} (${formatMaskedValue(officialIdMask, option.officialId)})`;
      }}
      onInputChange={(event, newInputValue, reason) => {
        setInputValue(newInputValue);

        if (reason === 'input') {
          debouncedHandleCompanyQuery(newInputValue);
        }
      }}
      onChange={(event, newValue) => {
        props.onChange(
          newValue
            ? {
                officialId: newValue.officialId,
                name: newValue.name,
              }
            : null
        );
      }}
      onBlur={props.onBlur}
      loading={suggestionsLoading}
      selectOnFocus
      handleHomeEndKeys
      loadingText="Recherche en cours..."
      noOptionsText="Aucune suggestion d'entreprise"
      fullWidth
    />
  );
}
