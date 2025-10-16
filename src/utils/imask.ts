import { FactoryArg } from 'imask';
import IMask from 'imask';

export function formatMaskedValue(maskOptions: FactoryArg, value: string) {
  // Each mask of `imask` has its own instance, that's why a factory like this is needed
  const mask = IMask.createMask(maskOptions);

  mask.resolve(value);

  return mask.value; // Masked value
}
