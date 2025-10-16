import { searchAddressSuggestions as real_searchAddressSuggestions } from '@ad/src/client/national-address-base';
import { areMocksGloballyEnabled } from '@ad/src/utils/environment';

const mock_searchAddressSuggestions: typeof real_searchAddressSuggestions = async function (query: string) {
  console.log(`"searchAddressSuggestions" mock has been called`);

  return [
    {
      street: '4 Rue Jean Moulin',
      postalCode: '35000',
      city: 'Rennes',
      subdivision: '',
      countryCode: 'FR',
      regionContext: '35, Ille-et-Vilaine, Bretagne',
    },
  ];
};

export const searchAddressSuggestions: typeof real_searchAddressSuggestions = areMocksGloballyEnabled()
  ? mock_searchAddressSuggestions
  : real_searchAddressSuggestions;
