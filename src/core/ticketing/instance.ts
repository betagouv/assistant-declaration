import { TicketingSystem } from '@prisma/client';

import { BilletwebTicketingSystemClient } from '@ad/src/core/ticketing/billetweb';
import { MockTicketingSystemClient, TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { MapadoTicketingSystemClient } from '@ad/src/core/ticketing/mapado';
import { RodrigueTicketingSystemClient } from '@ad/src/core/ticketing/rodrigue';
import { SoticketTicketingSystemClient } from '@ad/src/core/ticketing/soticket';
import { SupersoniksTicketingSystemClient } from '@ad/src/core/ticketing/supersoniks';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

export function getTicketingSystemClient(
  ticketingSystem: Pick<TicketingSystem, 'name' | 'apiAccessKey' | 'apiSecretKey'>,
  userId: string
): TicketingSystemClient {
  let ticketingSystemClient: TicketingSystemClient;

  if (
    process.env.APP_MODE !== 'prod' &&
    (!process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS || !process.env.DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS.split(',').includes(userId))
  ) {
    ticketingSystemClient = new MockTicketingSystemClient();
  } else {
    switch (ticketingSystem.name) {
      case 'BILLETWEB':
        assert(ticketingSystem.apiAccessKey);
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new BilletwebTicketingSystemClient(ticketingSystem.apiAccessKey, ticketingSystem.apiSecretKey);
        break;
      case 'MAPADO':
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new MapadoTicketingSystemClient(ticketingSystem.apiSecretKey);
        break;
      case 'SOTICKET':
        assert(ticketingSystem.apiAccessKey);
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new SoticketTicketingSystemClient(ticketingSystem.apiAccessKey, ticketingSystem.apiSecretKey);
        break;
      case 'SUPERSONIKS':
        assert(ticketingSystem.apiAccessKey);
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new SupersoniksTicketingSystemClient(ticketingSystem.apiAccessKey, ticketingSystem.apiSecretKey);
        break;
      case 'RODRIGUE':
        assert(ticketingSystem.apiAccessKey);
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new RodrigueTicketingSystemClient(ticketingSystem.apiAccessKey, ticketingSystem.apiSecretKey);
        break;
      default:
        throw new Error('unknown ticketing system');
    }
  }

  return ticketingSystemClient;
}
