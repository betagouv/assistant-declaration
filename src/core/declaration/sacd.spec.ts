/**
 * @jest-environment node
 */
import { secondsToMilliseconds, set } from 'date-fns';

import { SacdClient, prepareDeclarationParameter } from '@ad/src/core/declaration/sacd';
import { sacdDeclarations } from '@ad/src/fixtures/declaration/sacd';
import declarationParameterXml from '@ad/src/fixtures/declaration/sacd-declaration-parameter.xml';
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
    'should submit a declaration',
    async () => {
      await client.declare('TODO', eventsSeries[0], eventsWrappers, sacdDeclarations[0]);
    },
    secondsToMilliseconds(30)
  );
});

describe('prepareDeclarationParameter', () => {
  it(
    'should transform entities to the right formatted xml parameter',
    async () => {
      const xml = prepareDeclarationParameter('TODO', eventsSeries[0], eventsWrappers, sacdDeclarations[0]);

      expect(xml).toBe(declarationParameterXml);
    },
    secondsToMilliseconds(30)
  );
});
