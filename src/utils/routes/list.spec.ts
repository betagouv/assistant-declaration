import { generateRewrites, localizedRoutes } from '@ad/src/utils/routes/list';

describe('route list', () => {
  it('should generate URL rewrites for Next.js', async () => {
    const generated = generateRewrites('en', {
      legalNotice: localizedRoutes.legalNotice,
    } as any); // We cast to not test all of them

    expect(generated).toStrictEqual([
      {
        source: '/mentions-legales',
        destination: '/legal-notice',
      },
    ]);
  });
});
