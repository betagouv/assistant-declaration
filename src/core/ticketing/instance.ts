import { TicketingSystem } from '@prisma/client';

import { BilletwebTicketingSystemClient } from '@ad/src/core/ticketing/billetweb';
import { MockTicketingSystemClient, TicketingSystemClient } from '@ad/src/core/ticketing/common';
import { HelloassoTicketingSystemClient } from '@ad/src/core/ticketing/helloasso';
import { MapadoTicketingSystemClient } from '@ad/src/core/ticketing/mapado';
import { ShotgunTicketingSystemClient } from '@ad/src/core/ticketing/shotgun';
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
      case 'HELLOASSO':
        assert(ticketingSystem.apiAccessKey);
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new HelloassoTicketingSystemClient(ticketingSystem.apiAccessKey, ticketingSystem.apiSecretKey, false);
        break;
      case 'MAPADO':
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new MapadoTicketingSystemClient(ticketingSystem.apiSecretKey);
        break;
      case 'SHOTGUN':
        assert(ticketingSystem.apiAccessKey);
        assert(ticketingSystem.apiSecretKey);

        ticketingSystemClient = new ShotgunTicketingSystemClient(ticketingSystem.apiAccessKey, ticketingSystem.apiSecretKey);
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
      case 'MANUAL':
        throw new Error('manual ticketing system should not be used as other ones');
      default:
        throw new Error('unknown ticketing system');
    }
  }

  return ticketingSystemClient;
}
