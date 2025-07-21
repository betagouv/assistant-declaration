import { z } from 'zod';

export const CsvSacemAgencySchema = z
  .object({
    LOCAL: z.string().trim().min(1),
    CP: z.string().trim().length(5),
    Mail: z
      .string()
      .trim()
      .email()
      .transform((value) =>
        // Some emails are not lowercase
        value.toLowerCase()
      ),
  })
  .strip();
export type CsvSacemAgencySchemaType = z.infer<typeof CsvSacemAgencySchema>;
