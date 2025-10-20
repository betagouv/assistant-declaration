import { z } from 'zod';

export const CsvSacdAgencySchema = z
  .object({
    Département: z.string().trim().min(2).max(5),
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
