import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import z from 'zod';

export interface RowForForm<T, E> {
  index: number;
  data: T;
  errors: E;
}

export function recursiveCountErrors(errors: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined): number {
  // [WORKDAROUND] We cannot rely on `control._fields` that does not contain arrays and so their children
  // Also `control._names` does not list the children so we ended with a hack below just to keep a uniform logic
  // Ref: https://github.com/orgs/react-hook-form/discussions/12527

  let count = 0;

  // `null` is of type `object` so checking this
  // Also, skip properties that would refer to the DOM element of an input since it has circular loops due to parent/children properties
  if (typeof errors === 'object' && errors && !(errors instanceof Element)) {
    // A field could be named `message` so we make sure here it's an error and not a field to parse
    if (typeof errors.message === 'string') {
      count += 1;
    }

    if (Array.isArray(errors)) {
      errors.forEach((error) => {
        count += recursiveCountErrors(error);
      });
    } else {
      Object.values(errors).forEach((error) => {
        count += recursiveCountErrors(error);
      });
    }
  }

  return count;
}

export function emptyStringtoNullPreprocessor<T extends z.ZodString | z.ZodDate | z.ZodCoercedNumber>(initialValidation: z.ZodNullable<T>) {
  return z.preprocess((value) => {
    if (value === '') {
      return null;
    }

    return value;
  }, initialValidation);
}

export function transformStringOrNull(value: string): string | null {
  return value !== '' ? value : null;
}

export function transformTimestampOrNull(value: number): number | null {
  return value === 0 ? null : value;
}

export function coerceBoolean(value: any): boolean {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true' || value === '1') {
      return true;
    } else if (value.toLowerCase() === 'false' || value === '0') {
      return false;
    }
  } else if (typeof value === 'number') {
    if (value === 1) {
      return true;
    } else if (value === 0) {
      return false;
    }
  } else {
    return value;
  }

  throw new Error('not a safe value to coerce to boolean');
}

export function safeCoerceToOptionalBoolean(initialValidation: z.ZodOptional<z.ZodBoolean>) {
  // This is to avoid the situation of `z.coerce.boolean()` that is always true when passing a string (for example, new Boolean('false'))
  return z.preprocess((value) => {
    if (value === undefined) {
      return undefined;
    }

    return coerceBoolean(value);
  }, initialValidation);
}

export function safeCoerceToBoolean(initialValidation: z.ZodBoolean) {
  // This is to avoid the situation of `z.coerce.boolean()` that is always true when passing a string (for example, new Boolean('false'))
  return z.preprocess((value) => {
    return coerceBoolean(value);
  }, initialValidation);
}
