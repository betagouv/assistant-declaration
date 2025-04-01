/**
 * @jest-environment node
 */
import { secondsToMilliseconds, set } from 'date-fns';

import { SecutixTicketingSystemClient } from '@ad/src/core/ticketing/secutix';

const describeWhenManual = process.env.TEST_MANUAL === 'true' ? describe : describe.skip;
const itWhenManual = process.env.TEST_MANUAL === 'true' ? it : it.skip;

describeWhenManual('SecutixTicketingSystemClient', () => {
  const client = new SecutixTicketingSystemClient(process.env.TEST_SECUTIX_ACCESS_KEY || '', process.env.TEST_SECUTIX_SECRET_KEY || '');

  describe('getEventsSeries()', () => {
    it(
      'should return events in specific timeframe',
      async () => {
        const fromDate = set(new Date(0), { year: 2024, month: 1, date: 1 });
        const toDate = set(new Date(0), { year: 2025, month: 1, date: 1 });

        const wrappers = await client.getEventsSeries(fromDate, toDate);

        expect(wrappers.length).toBeGreaterThanOrEqual(10);
      },
      secondsToMilliseconds(60)
    );
  });
});
