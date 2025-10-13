import z from 'zod';

import {
  inputReplacementForSensitiveData,
  passwordRequiresANumericError,
  passwordRequiresASpecialCharactersError,
  passwordRequiresHeightCharactersError,
  passwordRequiresLowerAndUpperCharactersError,
} from '@ad/src/models/entities/errors';
import { customErrorToZodIssue } from '@ad/src/models/entities/errors/helpers';

export const UserStatusSchema = z.enum(['REGISTERED', 'CONFIRMED', 'DISABLED']);
export type UserStatusSchemaType = z.infer<typeof UserStatusSchema>;

export const UserPasswordSchema = z
  .string()
  .min(1)
  .superRefine((data, ctx) => {
    if (data === data.toUpperCase() || data === data.toLowerCase()) {
      ctx.issues.push({
        ...customErrorToZodIssue(passwordRequiresLowerAndUpperCharactersError),
        input: inputReplacementForSensitiveData,
      });
    }

    if (data.length < 8) {
      ctx.issues.push({
        ...customErrorToZodIssue(passwordRequiresHeightCharactersError),
        input: inputReplacementForSensitiveData,
      });
    }

    if (!/[0-9]+/.test(data)) {
      ctx.issues.push({
        ...customErrorToZodIssue(passwordRequiresANumericError),
        input: inputReplacementForSensitiveData,
      });
    }

    if (!/[^a-zA-Z0-9]+/.test(data)) {
      ctx.issues.push({
        ...customErrorToZodIssue(passwordRequiresASpecialCharactersError),
        input: inputReplacementForSensitiveData,
      });
    }
  });
export type UserPasswordSchemaType = z.infer<typeof UserPasswordSchema>;

export const UserSchema = z
  .object({
    id: z.uuid(),
    firstname: z.string().min(1),
    lastname: z.string().min(1),
    email: z.string().min(1).email(),
    status: UserStatusSchema,
    lastActivityAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .strict();
export type UserSchemaType = z.infer<typeof UserSchema>;

export const VerificationTokenActionSchema = z.enum(['SIGN_UP', 'RESET_PASSWORD']);
export type VerificationTokenActionSchemaType = z.infer<typeof VerificationTokenActionSchema>;

export const VerificationTokenSchema = z
  .object({
    action: VerificationTokenActionSchema,
    token: z.string().min(1),
    identifier: UserSchema.shape.id,
    expires: z.date(),
  })
  .strict();
export type VerificationTokenSchemaType = z.infer<typeof VerificationTokenSchema>;

// This is a lite version of the user entity to be available on the frontend
export const TokenUserSchema = z
  .object({
    id: UserSchema.shape.id,
    firstname: UserSchema.shape.firstname,
    lastname: UserSchema.shape.lastname,
    email: UserSchema.shape.email,
  })
  .strict();
export type TokenUserSchemaType = z.infer<typeof TokenUserSchema>;

// This is the JWT extra data
export const JwtDataSchema = z
  .object({
    sub: UserSchema.shape.id,
    email: UserSchema.shape.email,
    given_name: UserSchema.shape.firstname,
    family_name: UserSchema.shape.lastname,
  })
  .strict();
export type JwtDataSchemaType = z.infer<typeof JwtDataSchema>;

export const LiveChatSettingsSchema = z
  .object({
    userId: UserSchema.shape.id,
    email: UserSchema.shape.email,
    emailSignature: z.string(),
    firstname: UserSchema.shape.firstname,
    lastname: UserSchema.shape.lastname,
    sessionToken: z.string(),
  })
  .strict();
export type LiveChatSettingsSchemaType = z.infer<typeof LiveChatSettingsSchema>;
