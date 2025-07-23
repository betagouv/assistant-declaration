/**
 * @jest-environment node
 */
import { secondsToMilliseconds, set } from 'date-fns';

import { HelloassoTicketingSystemClient } from '@ad/src/core/ticketing/helloasso';

const describeWhenManual = process.env.TEST_MANUAL === 'true' ? describe : describe.skip;
const itWhenManual = process.env.TEST_MANUAL === 'true' ? it : it.skip;

describeWhenManual('HelloassoTicketingSystemClient', () => {
  const useTestEnvironment = true;
  const client = new HelloassoTicketingSystemClient(
    process.env.TEST_HELLOASSO_ACCESS_KEY || '',
    process.env.TEST_HELLOASSO_SECRET_KEY || '',
    useTestEnvironment
  );

  describe('getEventsSeries()', () => {
    it(
      'should return events in specific timeframe',
      async () => {
        const fromDate = set(new Date(0), { year: 2024, month: 11, date: 18 });
        const toDate = set(new Date(0), { year: 2024, month: 12, date: 1 });

        const wrappers = await client.getEventsSeries(fromDate, toDate);

        expect(wrappers.length).toBeGreaterThanOrEqual(3);
      },
      secondsToMilliseconds(30)
    );
  });
});
