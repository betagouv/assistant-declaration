import { createContext } from 'react';

import { ChangePasswordForm } from '@ad/src/app/(private)/account/settings/ChangePasswordForm';
import { EditProfileForm } from '@ad/src/app/(private)/account/settings/EditProfileForm';

export const AccountSettingsPageContext = createContext({
  ContextualEditProfileForm: EditProfileForm,
  ContextualChangePasswordForm: ChangePasswordForm,
});
