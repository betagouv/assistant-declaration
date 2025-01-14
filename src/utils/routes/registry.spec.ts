import { LinkRegistry } from '@ad/src/utils/routes/registry';

describe('routes', () => {
  const baseUrl = 'http://localhost:3000';
  let linkRegistry: LinkRegistry;

  beforeAll(async () => {
    linkRegistry = new LinkRegistry({ defaultLang: 'fr', baseUrl: baseUrl });
  });

  it('should get default language link', async () => {
    const link = linkRegistry.get('legalNotice', undefined);
    expect(link).toBe('/mentions-legales');
  });

  it('should get overridden language link', async () => {
    const link = linkRegistry.get('legalNotice', undefined, { lang: 'en' });
    expect(link).toBe('/legal-notice');
  });

  it('should get an absolute link', async () => {
    const link = linkRegistry.get('legalNotice', undefined, { absolute: true });
    expect(link).toBe('http://localhost:3000/mentions-legales');
  });
});
