import { z } from 'zod';

export const JsonErrorResponseSchema = z.object({ Error: z.object({ Code: z.string().min(1), Message: z.string().min(1) }) });
export type JsonErrorResponseSchemaType = z.infer<typeof JsonErrorResponseSchema>;

export const JsonHelloWorldResponseSchema = z.object({ Result: z.literal('Hello World!') });
export type JsonHelloWorldResponseSchemaType = z.infer<typeof JsonHelloWorldResponseSchema>;

export const JsonLoginResponseSchema = z.object({ AuthToken: z.string().min(1) });
export type JsonLoginResponseSchemaType = z.infer<typeof JsonLoginResponseSchema>;
