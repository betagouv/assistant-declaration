import { createClient } from '@hey-api/openapi-ts';

createClient({
  // [WORKAROUND] Until they fix required types for each endpoint, we use a patched file (ref: https://github.com/HelloAsso/helloasso-open-api/issues/15)
  // input: 'https://raw.githubusercontent.com/HelloAsso/helloasso-open-api/refs/heads/main/helloasso.json',
  input: 'src/client/helloasso.json',
  output: 'src/client/helloasso',
  plugins: ['@hey-api/client-fetch'],
});
