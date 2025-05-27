import { areMocksGloballyEnabled } from '@ad/src/utils/environment';
import { useLocalStorageViewedTicketingModal as real_useLocalStorageViewedTicketingModal } from '@ad/src/utils/ticketing';

export const useLocalStorageViewedTicketingModal: typeof real_useLocalStorageViewedTicketingModal = areMocksGloballyEnabled()
  ? () => [true, () => {}] as const // By default we consider it as viewed to avoid showing the modal
  : real_useLocalStorageViewedTicketingModal;
