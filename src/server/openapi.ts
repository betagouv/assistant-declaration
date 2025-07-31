import { generateOpenApiDocument } from 'trpc-to-openapi';

import { appRouter } from '@ad/src/server/app-router';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Assistant déclaration - OpenAPI',
  description: '... TODO',
  version: '0.0.1',
  baseUrl: 'https://assistant-declaration.beta.gouv.fr',
  docsUrl: 'https://assistant-declaration.beta.gouv.fr/docs/api',
  filter: (ctx) => {
    // Only export specific endpoints into the documentation
    if (ctx.metadata.openapi.tags?.includes('partner')) {
      return true;
    }

    return false;
  },
});
