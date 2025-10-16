import { searchCompanySuggestions as real_searchCompanySuggestions } from '@ad/src/client/api-gouv-fr';
import { areMocksGloballyEnabled } from '@ad/src/utils/environment';

const mock_searchCompanySuggestions: typeof real_searchCompanySuggestions = async function (query: string) {
  console.log(`"searchCompanySuggestions" mock has been called`);

  return [
    {
      officialId: '130025265',
      officialHeadquartersId: '13002526500013',
      name: 'DIRECTION INTERMINISTERIELLE DU NUMERIQUE',
      inlineHeadquartersAddress: '20 Avenue de Ségur 75007 Paris',
    },
  ];
};

export const searchCompanySuggestions: typeof real_searchCompanySuggestions = areMocksGloballyEnabled()
  ? mock_searchCompanySuggestions
  : real_searchCompanySuggestions;
