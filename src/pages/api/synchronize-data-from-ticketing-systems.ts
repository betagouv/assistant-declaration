import { secondsToMilliseconds } from 'date-fns';
import { NextApiRequest, NextApiResponse } from 'next';
import { getToken as nextAuthGetToken } from 'next-auth/jwt';

import { synchronizeDataFromTicketingSystems } from '@ad/src/core/ticketing/synchronize';
import { SynchronizeDataFromTicketingSystemsSchema } from '@ad/src/models/actions/event';
import { BusinessError, internalServerErrorError, unauthorizedError } from '@ad/src/models/entities/errors';
import { nextAuthOptions } from '@ad/src/pages/api/auth/[...nextauth]';
import { CHUNK_DATA_PREFIX, CHUNK_ERROR_PREFIX, CHUNK_PING_PREFIX, apiHandlerWrapper } from '@ad/src/utils/api';

// This has been implemented because Scalingo returns a timeout response after 60 seconds
// so we have to stream some data... we did try to upgrade to tRPC v11 for this but the migration seems
// too complicated due to missing types for Next.js app router (maybe better in the future)
export async function handler(req: NextApiRequest, res: NextApiResponse) {
  const nextjsReq = req as NextApiRequest;
  const token = await nextAuthGetToken({ req: nextjsReq, secret: nextAuthOptions.secret });

  if (!token) {
    throw unauthorizedError.cloneWithHttpCode(401);
  }

  const input = SynchronizeDataFromTicketingSystemsSchema.parse(req.body);

  // We can leave the rest above because the error format will be managed by `apiHandlerWrapper()`
  let intervalId: NodeJS.Timeout | null = null;

  try {
    // Send the ping regularly to avoid the Scalingo timeout
    intervalId = setInterval(() => {
      res.write(`${CHUNK_PING_PREFIX}true\n`);
    }, secondsToMilliseconds(10));

    await synchronizeDataFromTicketingSystems(input.organizationId, token.sub);

    // Send a signal for the frontend to know it has successfully finished
    res.write(`${CHUNK_DATA_PREFIX}done\n`);
  } catch (error) {
    console.log(`an error has occured during synchronization`);
    console.log(error);

    const safeError = error instanceof BusinessError ? error : internalServerErrorError;

    res.write(`${CHUNK_ERROR_PREFIX}${JSON.stringify(safeError.json())}\n`); // Add a new line to have the same format

    // We still throw the error so the wrapper can perform its additional custom logic
    throw error;
  } finally {
    if (intervalId) {
      clearInterval(intervalId);
    }

    res.end();
  }
}

export default apiHandlerWrapper(handler, {
  restrictMethods: ['POST'],
});
