import { AddressSchemaType } from '@ad/src/models/entities/address';

export const baseUrl = 'https://data.geopf.fr';

export interface LocationApiProperties {
  type: 'housenumber' | 'street' | 'locality' | 'municipality';
  id: string;
  banId: string;
  housenumber?: string;
  street: string;
  name: string; // Combination of house number and street if house number provided, corresponding to our internal `street`
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
  url.searchParams.append('limit', '5'); // 5 is the default limit
  url.searchParams.append('autocomplete', '1');

  // By default we wanted to only list precise building number in a street, but it appears sometimes
  // companies are registered in buildings that are not referenced in the official directory, so as fallback we
  // still want to display what the most convenient (road, street...), but not the city that would be too wide
  // Note: since we cannot specify multiple types (only the latter is kept only) as filters, we take all of them and filter manually (it will reduce the number of results probably but we are fine in the case of a search bar)
  // url.searchParams.append('type', 'housenumber');

  const response = await fetch(url);

  if (response.ok) {
    const data = (await response.json()) as LocationApiSearchAddressSuggestionsResponse;

    // Filter according to the comment above
    const filteredFeatues = data.features.filter((feature) => {
      return feature.properties.type === 'housenumber' || feature.properties.type === 'street' || feature.properties.type === 'locality';
    });

    return filteredFeatues.map((feature) => {
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
