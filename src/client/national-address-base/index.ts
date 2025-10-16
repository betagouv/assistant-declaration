import { AddressSchemaType } from '@ad/src/models/entities/address';

export const baseUrl = 'https://data.geopf.fr';

export interface LocationApiProperties {
  id: string;
  banId: string;
  housenumber: string;
  street: string;
  name: string; // Combination of house number and street, corresponding to our internal `street`
  postcode: string;
  city: string;
  context: string; // Display concatenated "department" number with department name and region name
}

export interface LocationApiFeature {
  properties: LocationApiProperties;
}

export interface LocationApiSearchAddressSuggestionsResponse {
  features: LocationApiFeature[];
}

export type BanAddress = Pick<AddressSchemaType, 'street' | 'city' | 'postalCode' | 'subdivision' | 'countryCode'> & {
  regionContext: string;
};

export async function searchAddressSuggestions(query: string): Promise<BanAddress[]> {
  // The API expects 3 characters minimum, avoid throwing an error
  if (query.length < 3) {
    return [];
  }

  const url = new URL(`${baseUrl}/geocodage/search/`);
  url.searchParams.append('q', query);
  url.searchParams.append('type', 'housenumber'); // Ask for addresses only (not just localities or cities...), it's a burden if they want to specify just a street but we cannot ask for multiple types
  url.searchParams.append('limit', '5'); // 5 is the default limit
  url.searchParams.append('autocomplete', '1');

  const response = await fetch(url);

  if (response.ok) {
    const data = (await response.json()) as LocationApiSearchAddressSuggestionsResponse;

    return data.features.map((feature) => {
      return {
        street: feature.properties.name,
        postalCode: feature.properties.postcode,
        city: feature.properties.city,
        subdivision: '', // Not provided by the API, we are fine not specifying the region on address in France
        countryCode: 'FR',
        regionContext: feature.properties.context,
      };
    });
  } else {
    const error = await response.json();

    throw error;
  }
}
