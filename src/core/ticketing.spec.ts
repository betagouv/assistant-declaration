import { secondsToMilliseconds, set } from 'date-fns';

import { BilletwebTicketingSystemClient } from '@ad/src/core/ticketing';

const describeWhenManual = process.env.TEST_MANUAL === 'true' ? describe : describe.skip;
const itWhenManual = process.env.TEST_MANUAL === 'true' ? it : it.skip;

describeWhenManual('BilletwebTicketingSystemClient', () => {
  const client = new BilletwebTicketingSystemClient(process.env.TEST_BILLETWEB_ACCESS_KEY || '', process.env.TEST_BILLETWEB_SECRET_KEY || '');

  describe('getEventsSeries()', () => {
    it(
      'should return events in specific timeframe',
      async () => {
        const fromDate = set(new Date(0), { year: 2024, month: 11, date: 18 });
        const toDate = set(new Date(0), { year: 2024, month: 12, date: 1 });

        const wrappers = await client.getEventsSeries(fromDate, toDate);

        expect(wrappers.length).toBeGreaterThanOrEqual(10);
      },
      secondsToMilliseconds(30)
    );
  });
});
