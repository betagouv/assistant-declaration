import { createClient } from '@hey-api/openapi-ts';

createClient({
  input: 'https://staging.rodrigue-ws.com/v1/authentication/swagger/v1/swagger.json',
  output: 'src/client/rodrigue/auth',
  plugins: ['@hey-api/client-fetch'],
});

createClient({
  input: 'https://staging.rodrigue-ws.com/v1/external/swagger/ext/swagger.json',
  output: 'src/client/rodrigue/integration',
  plugins: ['@hey-api/client-fetch'],
});
