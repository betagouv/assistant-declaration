import { zx } from '@traversable/zod';
import z from 'zod';

import { UserSchema } from '@ad/src/models/entities/user';

export const UpdateProfileSchema = z
  .object({
    firstname: UserSchema.shape.firstname,
    lastname: UserSchema.shape.lastname,
  })
  .strict();
export type UpdateProfileSchemaType = z.infer<typeof UpdateProfileSchema>;

export const UpdateProfilePrefillSchema = zx.deepPartial(UpdateProfileSchema, 'applyToOutputType');
export type UpdateProfilePrefillSchemaType = z.infer<typeof UpdateProfilePrefillSchema>;

export const GetProfileSchema = z.object({}).strict();
export type GetProfileSchemaType = z.infer<typeof GetProfileSchema>;

export const GetProfilePrefillSchema = zx.deepPartial(GetProfileSchema, 'applyToOutputType');
export type GetProfilePrefillSchemaType = z.infer<typeof GetProfilePrefillSchema>;

export const GetInterfaceSessionSchema = z.object({}).strict();
export type GetInterfaceSessionSchemaType = z.infer<typeof GetInterfaceSessionSchema>;

export const GetInterfaceSessionPrefillSchema = zx.deepPartial(GetInterfaceSessionSchema, 'applyToOutputType');
export type GetInterfaceSessionPrefillSchemaType = z.infer<typeof GetInterfaceSessionPrefillSchema>;

export const GetLiveChatSettingsSchema = z.object({}).strict();
export type GetLiveChatSettingsSchemaType = z.infer<typeof GetLiveChatSettingsSchema>;

export const GetLiveChatSettingsPrefillSchema = zx.deepPartial(GetLiveChatSettingsSchema, 'applyToOutputType');
export type GetLiveChatSettingsPrefillSchemaType = z.infer<typeof GetLiveChatSettingsPrefillSchema>;
