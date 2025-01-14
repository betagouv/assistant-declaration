import { useContext } from 'react';

import { LiveChatContext } from '@ad/src/components/live-chat/LiveChatContext';

export const useLiveChat = () => {
  return useContext(LiveChatContext);
};
