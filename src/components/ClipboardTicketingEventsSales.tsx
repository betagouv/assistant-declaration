import { useTranslation } from 'react-i18next';

import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { capitalizeFirstLetter } from '@ad/src/utils/format';

export interface ClipboardTicketingEventsSalesProps {
  eventSerieName: string;
  eventsWrappers: EventWrapperSchemaType[];
}

export function ClipboardTicketingEventsSales(props: ClipboardTicketingEventsSalesProps) {
  const { t } = useTranslation();
  return (
    <table>
      <thead>
        <tr>
          <th>Spectacle</th>
          <th>Date</th>
          <th>Catégorie des tickets</th>
          <th>Prix unitaire TTC</th>
          <th>Nombre de billets vendus</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={5}>
            <b>{props.eventSerieName}</b>
          </td>
        </tr>
        {props.eventsWrappers.map((eventWrapper) => (
          <>
            <tr key={eventWrapper.event.id}>
              <td></td>
              <td colSpan={4}>
                <b>{capitalizeFirstLetter(t('date.longWithTime', { date: eventWrapper.event.startAt }))}</b>
              </td>
            </tr>
            {eventWrapper.sales.length > 0 ? (
              <>
                {eventWrapper.sales.map((salesItem) => (
                  <tr>
                    <td colSpan={2}></td>
                    <td>{salesItem.ticketCategory.name}</td>
                    <td>
                      {t('number.defaultWithNoGrouping', { number: salesItem.eventCategoryTickets.priceOverride ?? salesItem.ticketCategory.price })}
                    </td>
                    <td>{salesItem.eventCategoryTickets.totalOverride ?? salesItem.eventCategoryTickets.total}</td>
                  </tr>
                ))}
              </>
            ) : (
              <>
                {/* If there is no sales for a category we leave a line row so it's understandable */}
                <tr>
                  <td colSpan={2}></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </>
            )}
          </>
        ))}
      </tbody>
    </table>
  );
}
