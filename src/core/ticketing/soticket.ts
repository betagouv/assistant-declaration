import { SupersoniksTicketingSystemClient } from '@ad/src/core/ticketing/supersoniks';

// SoTicket is just a different brand for Supersoniks, but since we cannot just concatenate their name due to different logos...
// We made a new ticketing system reusing the same connector
export const SoticketTicketingSystemClient = SupersoniksTicketingSystemClient;
