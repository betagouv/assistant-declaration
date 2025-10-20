import { z } from 'zod';

export const CsvSacdAgencySchema = z
  .object({
    Département: z.preprocess((value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const safeValue = value.trim().toLowerCase();

      // The SACD file may not be using only postal code prefixes, so adjusting it correctly
      if (safeValue === 'monaco') {
        return '980';
      } else if (safeValue === '2a/2b') {
        return '20';
      }

      return safeValue;
    }, z.string().min(2).max(5)),
    mail: z
      .email()
      .trim()
      .transform((value) =>
        // Some emails are not lowercase
        value.toLowerCase()
      ),
  })
  .strip();
export type CsvSacdAgencySchemaType = z.infer<typeof CsvSacdAgencySchema>;
