/**
 * @jest-environment node
 */
import { secondsToMilliseconds, set } from 'date-fns';

import { SacdClient } from '@ad/src/core/declaration/sacd';
import { sacdDeclarations } from '@ad/src/fixtures/declaration/sacd';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';

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

  beforeAll(async () => {
    await client.login();
  }, secondsToMilliseconds(10));

  afterAll(async () => {
    if (client.loggedIn()) {
      await client.logout();
    }
  }, secondsToMilliseconds(10));

  it(
    'should test authenticated flow',
    async () => {
      await client.test();
    },
    secondsToMilliseconds(30)
  );

  it(
    'should test a declaration submission',
    async () => {
      await client.declare('712790', eventsSeries[0], eventsWrappers, sacdDeclarations[0]);
    },
    secondsToMilliseconds(30)
  );
});
