import { useContext } from 'react';

import { UserInterfaceSessionContext } from '@ad/src/components/user-interface-session/UserInterfaceSessionContext';

export const useUserInterfaceSession = () => {
  const { session } = useContext(UserInterfaceSessionContext);

  return {
    userInterfaceSession: session,
  };
};

export const useUserInterfaceOrganization = (organizationId: string) => {
  const { session } = useContext(UserInterfaceSessionContext);

  return {
    userInterfaceOrganization:
      session?.collaboratorOf.find((organization) => {
        return organization.id === organizationId;
      }) || null,
  };
};
