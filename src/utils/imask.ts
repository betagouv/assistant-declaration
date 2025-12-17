import { FactoryArg } from 'imask';
import IMask from 'imask';
import { FactoryOpts } from 'imask';

export function formatMaskedValue(maskOptions: FactoryArg, value: string) {
  // Each mask of `imask` has its own instance, that's why a factory like this is needed
  const mask = IMask.createMask(maskOptions);

  mask.resolve(value);

  return mask.value; // Masked value
}

// The following patterns can be used directly with `xxx.format(value)`
// Note: they are outside their appropriate component to be reused in case of formatting in a pure textual context
export const officialIdMask: FactoryOpts = {
  mask: '000 000 000',
  definitions: {
    '0': /[0-9]/,
  },
  overwrite: 'shift',
};

export const officialHeadquartersIdMask: FactoryOpts = {
  mask: '000 000 000 00000',
  definitions: {
    '0': /[0-9]/,
  },
  overwrite: 'shift',
};

export const sacemIdMask: FactoryOpts = {
  mask: '0000000000',
  definitions: {
    '0': /[0-9]/,
  },
  overwrite: 'shift',
};

export const sacdIdMask: FactoryOpts = {
  mask: '0000000000',
  definitions: {
    '0': /[0-9]/,
  },
  overwrite: 'shift',
};
