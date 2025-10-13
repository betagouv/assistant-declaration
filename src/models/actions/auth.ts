import { zx } from '@traversable/zod';
import z from 'zod';

import { UserPasswordSchema, UserSchema, VerificationTokenSchema } from '@ad/src/models/entities/user';

export const SignInSchema = z
  .object({
    email: UserSchema.shape.email,
    password: z.string().min(1), // Complex validation is done with `UserPasswordSchema` when mutating the password
    rememberMe: z.boolean(),
  })
  .strict();
export type SignInSchemaType = z.infer<typeof SignInSchema>;

export const SignInPrefillSchema = zx.deepPartial(SignInSchema, 'applyToOutputType');
export type SignInPrefillSchemaType = z.infer<typeof SignInPrefillSchema>;

export const SignUpSchema = z.object({
  email: UserSchema.shape.email,
  password: UserPasswordSchema,
  firstname: UserSchema.shape.firstname,
  lastname: UserSchema.shape.lastname,
  termsAccepted: z.literal<boolean>(true),
});
export type SignUpSchemaType = z.infer<typeof SignUpSchema>;

export const SignUpPrefillSchema = zx.deepPartial(SignUpSchema, 'applyToOutputType');
export type SignUpPrefillSchemaType = z.infer<typeof SignUpPrefillSchema>;

export const ConfirmSignUpSchema = z.object({
  token: z.uuid(),
});
export type ConfirmSignUpSchemaType = z.infer<typeof ConfirmSignUpSchema>;

export const ConfirmSignUpPrefillSchema = zx.deepPartial(ConfirmSignUpSchema, 'applyToOutputType');
export type ConfirmSignUpPrefillSchemaType = z.infer<typeof ConfirmSignUpPrefillSchema>;

export const RequestNewPasswordSchema = z
  .object({
    email: UserSchema.shape.email,
  })
  .strict();
export type RequestNewPasswordSchemaType = z.infer<typeof RequestNewPasswordSchema>;

export const RequestNewPasswordPrefillSchema = zx.deepPartial(RequestNewPasswordSchema, 'applyToOutputType');
export type RequestNewPasswordPrefillSchemaType = z.infer<typeof RequestNewPasswordPrefillSchema>;

export const ResetPasswordSchema = z
  .object({
    token: VerificationTokenSchema.shape.token,
    password: UserPasswordSchema,
  })
  .strict();
export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;

export const ResetPasswordPrefillSchema = zx.deepPartial(ResetPasswordSchema, 'applyToOutputType');
export type ResetPasswordPrefillSchemaType = z.infer<typeof ResetPasswordPrefillSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: UserPasswordSchema,
  })
  .strict();
export type ChangePasswordSchemaType = z.infer<typeof ChangePasswordSchema>;

export const ChangePasswordPrefillSchema = zx.deepPartial(ChangePasswordSchema, 'applyToOutputType');
export type ChangePasswordPrefillSchemaType = z.infer<typeof ChangePasswordPrefillSchema>;
