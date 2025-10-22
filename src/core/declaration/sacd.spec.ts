/**
 * @jest-environment node
 */
import { secondsToMilliseconds, set } from 'date-fns';

import { SacdClient, prepareDeclarationParameter } from '@ad/src/core/declaration/sacd';
import { sacdDeclarations } from '@ad/src/fixtures/declaration/sacd';
import declarationParameterXml from '@ad/src/fixtures/declaration/sacd-declaration-parameter.xml';

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
      await client.declare(sacdDeclarations[0]);
    },
    secondsToMilliseconds(30)
  );
});

describe('prepareDeclarationParameter', () => {
  it(
    'should transform entities to the right formatted xml parameter',
    async () => {
      const declarationAt = set(new Date(0), { year: 2025, month: 1, date: 18 });

      const declaration = JSON.parse(JSON.stringify(sacdDeclarations[0])); // Deep copy

      // Use tricky float amounts to confirm they will be formatted correctly
      // (the tax amount should be `18.879999999999995` to be converted to `18.88`)
      declaration.events[0].ticketingRevenueExcludingTaxes = 899.12;
      declaration.events[0].ticketingRevenueIncludingTaxes = 918.0;
      declaration.events[0].ticketingRevenueTaxRate = 0.021;

      const xml = prepareDeclarationParameter(declaration, declarationAt);

      expect(xml).toBe(
        declarationParameterXml.replace('encoding="utf-8" ?>', 'encoding="utf-8"?>').replaceAll('<Exploitation />', '<Exploitation/>').trim()
      );
    },
    secondsToMilliseconds(30)
  );
});
