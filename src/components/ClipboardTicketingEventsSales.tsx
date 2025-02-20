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

  // [WORKAROUND] `colspan={x}` attribute to merge cells is working in browser, also Google Sheets
  // but unfortunately not inside Excel when pasting, it worst than that since it breaks the positioning.
  // So we multiply `<td>` tags to get something similar
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
          {/* Add a separation to make it cleaner */}
          <td>&nbsp;</td>
        </tr>
        <tr>
          <td>
            <b>{props.eventSerieName}</b>
          </td>
        </tr>
        {props.eventsWrappers.map((eventWrapper) => (
          <>
            <tr key={eventWrapper.event.id}>
              <td></td>
              <td>
                <b>{capitalizeFirstLetter(t('date.longWithTime', { date: eventWrapper.event.startAt }))}</b>
              </td>
            </tr>
            {eventWrapper.sales.length > 0 ? (
              <>
                {eventWrapper.sales.map((salesItem) => (
                  <tr key={salesItem.eventCategoryTickets.id}>
                    <td></td>
                    <td></td>
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
                {/* Add a separation, better in case of no ticketing category */}
                <tr>
                  <td></td>
                  <td></td>
                  <td>-</td>
                </tr>
              </>
            )}
          </>
        ))}
      </tbody>
    </table>
  );
}
