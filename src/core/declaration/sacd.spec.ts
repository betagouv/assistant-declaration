/**
 * @jest-environment node
 */
import { secondsToMilliseconds, set } from 'date-fns';

import { SacdClient } from '@ad/src/core/declaration/sacd';

const describeWhenManual = process.env.TEST_MANUAL === 'true' ? describe : describe.skip;
const itWhenManual = process.env.TEST_MANUAL === 'true' ? it : it.skip;

describeWhenManual('SacdClient', () => {
  const client = new SacdClient(
    process.env.TEST_SACD_API_CONSUMER_KEY || '',
    process.env.TEST_SACD_API_SECRET_KEY || '',
    process.env.TEST_SACD_API_PROVIDER_NAME || '',
    process.env.TEST_SACD_API_PROVIDER_REFFILE || '',
    process.env.TEST_SACD_API_PROVIDER_PASSWORD || ''
  );

  it(
    'should test authenticated flow',
    async () => {
      await client.login();
      await client.test();
      await client.logout();
    },
    secondsToMilliseconds(30)
  );
});
