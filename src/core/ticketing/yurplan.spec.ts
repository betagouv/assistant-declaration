import { secondsToMilliseconds, set } from 'date-fns';

import { YurplanTicketingSystemClient } from '@ad/src/core/ticketing/yurplan';

const describeWhenManual = process.env.TEST_MANUAL === 'true' ? describe : describe.skip;
const itWhenManual = process.env.TEST_MANUAL === 'true' ? it : it.skip;

describeWhenManual('YurplanTicketingSystemClient', () => {
  const client = new YurplanTicketingSystemClient(
    process.env.TEST_YURPLAN_PARTNER_CLIENT_ID || '',
    process.env.TEST_YURPLAN_PARTNER_CLIENT_SECRET || '',
    process.env.TEST_YURPLAN_ACCESS_KEY || '',
    process.env.TEST_YURPLAN_SECRET_KEY || ''
  );

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
