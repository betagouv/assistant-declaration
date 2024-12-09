import z from 'zod';

export const UserInterfaceSessionSchema = z
  .object({
    isAdmin: z.boolean(),
  })
  .strict();
export type UserInterfaceSessionSchemaType = z.infer<typeof UserInterfaceSessionSchema>;
