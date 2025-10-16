'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input, InputProps } from '@codegouvfr/react-dsfr/Input';
import Autocomplete from '@mui/material/Autocomplete';
import debounce from 'lodash.debounce';
import { FocusEventHandler, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { CompanySuggestion } from '@ad/src/client/api-gouv-fr';
import { officialHeadquartersIdMask } from '@ad/src/components/OfficialHeadquartersIdField';
import { searchCompanySuggestions } from '@ad/src/proxies/api-gouv-fr';
import { formatMaskedValue } from '@ad/src/utils/imask';

export interface CompanyHeadquarters {
  officialHeadquartersId: string;
}

export interface CompanyHeadquartersFieldProps {
  value?: CompanyHeadquarters | null;
  inputProps: Pick<InputProps, 'label' | 'nativeInputProps'>;
  onChange: (newValue: (CompanyHeadquarters & { name: string }) | null) => void;
  onBlur: FocusEventHandler<HTMLDivElement>;
  defaultSuggestions?: CompanyHeadquarters[];
  errorMessage?: string;
}

export function CompanyHeadquartersField(props: PropsWithChildren<CompanyHeadquartersFieldProps>) {
  // In the following headquarters address and ID and the name can be ommitted because if coming from the value and not listed it won't be used
  // We provide it just for the Autocomplete component to take the right type without casting
  const [defaultSuggestions] = useState<CompanySuggestion[]>(
    props.defaultSuggestions?.map((dS) => {
      return { ...dS, officialId: '', name: '', inlineHeadquartersAddress: '' };
    }) ?? []
  );
  const [searchCompanyHeadquartersQuerySuggestions, setSearchCompanyHeadquartersQuerySuggestions] = useState<CompanySuggestion[]>(defaultSuggestions);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);

  const adjustedValue = useMemo(
    () => (props.value ? { ...props.value, officialId: '', name: '', inlineHeadquartersAddress: '' } : null),
    [props.value]
  );
  const [inputValue, setInputValue] = useState('');

  const handleSearchCompanyHeadquartersQueryChange = useCallback(
    async (query: string) => {
      if (query !== '') {
        try {
          setSuggestionsLoading(true);

          const suggestions = await searchCompanySuggestions(query);

          setSearchCompanyHeadquartersQuerySuggestions(suggestions);
        } finally {
          setSuggestionsLoading(false);
        }
      } else {
        // When there is no input value, we make sure to at least propose initial suggestions to help the user
        setSearchCompanyHeadquartersQuerySuggestions(defaultSuggestions);
      }
    },
    [setSuggestionsLoading, defaultSuggestions]
  );

  const debouncedHandleCompanyHeadquartersQuery = useMemo(
    () => debounce(handleSearchCompanyHeadquartersQueryChange, 500),
    [handleSearchCompanyHeadquartersQueryChange]
  );
  useEffect(() => {
    return () => {
      debouncedHandleCompanyHeadquartersQuery.cancel();
    };
  }, [debouncedHandleCompanyHeadquartersQuery]);

  return (
    <Autocomplete
      value={adjustedValue}
      inputValue={inputValue}
      options={searchCompanyHeadquartersQuerySuggestions}
      filterOptions={(options, state) => options} // We want to show results from the API without any additional filtering from MUI
      renderInput={({ InputProps, disabled, id, inputProps }) => {
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
              <span className={fr.cx('fr-text--bold')}>{option.name}</span>
              &nbsp;
              <span style={{ fontStyle: 'italic' }}>(SIRET {formatMaskedValue(officialHeadquartersIdMask, option.officialHeadquartersId)})</span>
              <br />
              <span>{option.inlineHeadquartersAddress}</span>
            </div>
          </li>
        );
      }}
      getOptionLabel={(option) => {
        return formatMaskedValue(officialHeadquartersIdMask, option.officialHeadquartersId);
      }}
      onInputChange={(event, newInputValue, reason) => {
        setInputValue(newInputValue);

        if (reason === 'input') {
          debouncedHandleCompanyHeadquartersQuery(newInputValue);
        }
      }}
      onChange={(event, newValue) => {
        props.onChange(
          newValue
            ? {
                officialHeadquartersId: newValue.officialHeadquartersId,
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
      noOptionsText="Aucune suggestion d'établissement d'entreprise"
      fullWidth
    />
  );
}
