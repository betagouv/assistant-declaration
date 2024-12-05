import { NextApiRequest, NextApiResponse } from 'next';
import getConfig from 'next/config';

import { apiHandlerWrapper } from '@ad/src/utils/api';
import { linkRegistry } from '@ad/src/utils/routes/registry';

const { publicRuntimeConfig } = getConfig();

export function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow indexing in production
  if (publicRuntimeConfig.appMode === 'prod') {
    // Note: sitemap URLs need to be absolute (ref: https://stackoverflow.com/a/14218476/3608410)
    res.send(
      `
User-agent: *
Allow: /
`.trim()
    );
  } else {
    res.send(
      `
User-agent: *
Disallow: /
Allow: /.well-known/
`.trim()
    );
  }
}

export default apiHandlerWrapper(handler);
