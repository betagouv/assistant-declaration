/**
 * @jest-environment node
 */
import { secondsToMilliseconds } from 'date-fns';

import { SibilClient } from '@ad/src/core/declaration/sibil';
import { sibilDeclarations } from '@ad/src/fixtures/declaration/sibil';

const describeWhenManual = process.env.TEST_MANUAL === 'true' ? describe : describe.skip;
const itWhenManual = process.env.TEST_MANUAL === 'true' ? it : it.skip;

describeWhenManual('SibilClient', () => {
  const client = new SibilClient(process.env.TEST_SIBIL_API_USERNAME || '', process.env.TEST_SIBIL_API_PASSWORD || '');

  beforeAll(async () => {
    await client.login();
  }, secondsToMilliseconds(20));

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
      const declaration = JSON.parse(JSON.stringify(sibilDeclarations[0])); // Deep copy

      // Use tricky float amounts to confirm they will be formatted correctly
      // (the tax amount should be `18.879999999999995` to be converted to `18.88`)
      declaration.events[0].ticketingRevenueExcludingTaxes = 899.12;
      declaration.events[0].ticketingRevenueIncludingTaxes = 918.0;
      declaration.events[0].ticketingRevenueTaxRate = 0.021;

      await client.declare(declaration);
    },
    secondsToMilliseconds(30)
  );
});
