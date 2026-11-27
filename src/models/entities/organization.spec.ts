import { SacdIdSchema } from '@ad/src/models/entities/organization';

describe('SacdIdSchema', () => {
  it('should accept old-format numeric IDs (up to 10 digits)', () => {
    expect(() => SacdIdSchema.parse('123456789')).not.toThrow();
    expect(() => SacdIdSchema.parse('1')).not.toThrow();
    expect(() => SacdIdSchema.parse('1000000000')).not.toThrow();
  });

  it('should accept 32-character hexadecimal IDs', () => {
    expect(() => SacdIdSchema.parse('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).not.toThrow();
  });

  it('should accept uppercase hexadecimal IDs', () => {
    expect(() => SacdIdSchema.parse('A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4')).not.toThrow();
  });

  it('should accept mixed-case hexadecimal IDs', () => {
    expect(() => SacdIdSchema.parse('aB12Cd34Ef56')).not.toThrow();
  });

  it('should reject non-hex characters', () => {
    expect(() => SacdIdSchema.parse('g1b2c3d4')).toThrow();
    expect(() => SacdIdSchema.parse('z')).toThrow();
    expect(() => SacdIdSchema.parse('a1b2c3d4g')).toThrow();
  });

  it('should reject IDs longer than 32 characters', () => {
    expect(() => SacdIdSchema.parse('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e')).toThrow();
  });

  it('should reject empty strings', () => {
    expect(() => SacdIdSchema.parse('')).toThrow();
  });
});
