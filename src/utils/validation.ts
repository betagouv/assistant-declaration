import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import z from 'zod';

export interface RowForForm<T, E> {
  index: number;
  data: T;
  errors: E;
}

export function recursiveCountErrors(errors: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined): number {
  let count = 0;

  if (!errors) {
    return count;
  }
  if (errors.message) {
    count += 1;
  }

  if (typeof errors === 'object') {
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

export function emptyStringtoNullPreprocessor<T extends z.ZodString | z.ZodDate>(initialValidation: z.ZodNullable<T>) {
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
