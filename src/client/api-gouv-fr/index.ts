export const baseUrl = 'https://recherche-entreprises.api.gouv.fr';

export interface CompanyApiResult {
  siren: string;
  nom_complet: string; // That's a concatenation of the official name and the "sigle" when specified
  nom_raison_sociale: string | null;
  sigle: string | null;
  siege: {
    geo_id: string | null;
    geo_adresse: string | null;
    adresse: string;
    siret: string;
  };
}

export interface CompanyApiSearchCompanySuggestionsResponse {
  results: CompanyApiResult[];
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CompanySuggestion {
  officialId: string;
  officialHeadquartersId: string;
  name: string;
  inlineHeadquartersAddress: string;
}

export async function searchCompanySuggestions(query: string): Promise<CompanySuggestion[]> {
  // The API expects 3 characters minimum, avoid throwing an error
  if (query.length < 3) {
    return [];
  }

  const url = new URL(`${baseUrl}/search`);
  url.searchParams.append('q', query);
  url.searchParams.append('include', 'siege'); // Avoid other associations, no need of "score" since ordered by it descendingly
  url.searchParams.append('minimal', 'True'); // Required to return fields due to `include` parameter
  url.searchParams.append('page', '1'); // Keep only top results as suggestions
  url.searchParams.append('per_page', '5');

  const response = await fetch(url);

  if (response.ok) {
    const data = (await response.json()) as CompanyApiSearchCompanySuggestionsResponse;

    return data.results.map((result) => {
      return {
        officialId: result.siren,
        officialHeadquartersId: result.siege.siret,
        name: result.nom_raison_sociale ?? result.nom_complet,
        inlineHeadquartersAddress: result.siege.geo_adresse ?? result.siege.adresse, // For foreign companies registered the beautified `geo_adresse` is null, so using ugly `adresse`
      };
    });
  } else {
    const error = await response.json();

    throw error;
  }
}
