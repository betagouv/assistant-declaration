import { generateOpenApiDocument } from 'trpc-to-openapi';

import { appRouter } from '@ad/src/server/app-router';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Assistant déclaration - OpenAPI',
  description: `Il est important de lire en amont la documentation sur l'utilisation de cette API avant les spécifications techniques ci-dessous.`,
  version: '0.0.1',
  baseUrl: 'https://assistant-declaration.beta.gouv.fr',
  docsUrl: 'https://assistant-declaration.beta.gouv.fr/docs/ticketing-api-usage',
  filter: (ctx) => {
    // Only export specific endpoints into the documentation
    if (ctx.metadata.openapi.tags?.includes('partner')) {
      return true;
    }

    return false;
  },
});
