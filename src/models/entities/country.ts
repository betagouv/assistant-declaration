import { countries } from 'country-data';
import z from 'zod';

import { countryInvalidError } from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';

export const CountryCodeSchema = z.string().superRefine((countryCode, ctx) => {
  if (!countries[countryCode]) {
    ctx.issues.push({
      ...customErrorToZodIssue(countryInvalidError),
      input: countryCode,
    });
  }
});
export type CountryCodeSchemaType = z.infer<typeof CountryCodeSchema>;
