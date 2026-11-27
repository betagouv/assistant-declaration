import { getServerTranslation } from '@ad/src/i18n';
import { sacdIdMustBeHexError } from '@ad/src/models/entities/errors';

describe('SACD ID error messages', () => {
  it('should use sacdIdMustBeHexError instead of sacdIdMustBeDigitsError', () => {
    expect(sacdIdMustBeHexError).toBeDefined();
    expect(sacdIdMustBeHexError.code).toBe('sacdIdMustBeHex');
  });

  it('should have a message mentioning hexadecimal characters', () => {
    const message = sacdIdMustBeHexError.message;
    expect(message.toLowerCase()).toContain('hex');
  });

  it('should mention the 32 character limit in the too_big message', () => {
    const { t } = getServerTranslation('common', { lng: 'fr' });
    const tooBigMessage = t('errors.validation.sacdId.too_big', { maximum: 32 });
    expect(tooBigMessage).toContain('32');
  });

  it('should have french translation mentioning hexadecimal', () => {
    const { t } = getServerTranslation('common', { lng: 'fr' });
    const message = t('errors.validation.sacdId.sacdIdMustBeHex');
    expect(message.toLowerCase()).toContain('hexadécimaux');
  });

  it('should have english translation mentioning hexadecimal', () => {
    const { t } = getServerTranslation('common', { lng: 'en' });
    const message = t('errors.validation.sacdId.sacdIdMustBeHex');
    expect(message.toLowerCase()).toContain('hex');
  });
});
