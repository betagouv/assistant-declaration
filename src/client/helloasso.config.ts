import { createClient } from '@hey-api/openapi-ts';

createClient({
  // input: 'https://raw.githubusercontent.com/HelloAsso/helloasso-open-api/refs/heads/main/helloasso.json',
  input: 'src/client/helloasso.json',
  output: 'src/client/helloasso',
  plugins: ['@hey-api/client-fetch'],
});
