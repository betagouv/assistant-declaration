import { CustomErrorInterface, CustomErrorProperties } from 'ts-custom-error';
import { z } from 'zod';

import { i18n } from '@ad/src/i18n';
import { CustomError } from '@ad/src/models/entities/errors';

export interface ZodIssueOptions {
  overridePath?: string[];
}

export function customErrorToZodIssue(customError: CustomErrorInterface & CustomErrorProperties, options?: ZodIssueOptions): z.core.$ZodIssueCustom {
  return {
    path: options?.overridePath ?? [],
    code: 'custom',
    params: {
      type: customError.code,
    },
    message: capitalizeFirstLetter(customError.message),
  };
}

export const getCustomErrorTranslation = (error: CustomError): string | null => {
  const fullI18nPath = `errors.custom.${error.code}`;
  const translation = i18n.t(fullI18nPath, {} as any);

  return translation !== fullI18nPath ? translation : null;
};

export const formatMessageFromCustomError = (error: CustomError): string | null => {
  let translation = getCustomErrorTranslation(error);

  // Also check it's not an object if not end i18n translation
  if (!!translation && typeof translation !== 'object') {
    return translation;
  }

  return null;
};

export function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
