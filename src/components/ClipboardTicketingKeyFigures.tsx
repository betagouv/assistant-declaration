import { useTranslation } from 'react-i18next';

export interface ClipboardTicketingKeyFiguresProps {
  startAt: Date;
  endAt: Date;
  eventsCount: number;
  totalIncludingTaxesAmount: number;
  taxRate: number;
  averageTicketPrice: number;
  paidTickets: number;
  freeTickets: number;
}

export function ClipboardTicketingKeyFigures(props: ClipboardTicketingKeyFiguresProps) {
  const { t } = useTranslation('common');

  return (
    <table>
      <tbody>
        <tr>
          <td>Coucou</td>
          <td>1,2</td>
        </tr>
        <tr>
          <td>Coucou</td>
          <td>1,2</td>
        </tr>
      </tbody>
    </table>
  );
}
