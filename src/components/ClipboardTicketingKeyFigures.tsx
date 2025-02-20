import { useTranslation } from 'react-i18next';

import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';

export interface ClipboardTicketingKeyFiguresProps {
  eventSerieName: string;
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
  const { t } = useTranslation();
  return (
    <table>
      <tbody>
        <tr>
          <td>Spectacle</td>
          <td>{props.eventSerieName}</td>
        </tr>
        <tr>
          <td>Date de début</td>
          <td>{t('date.short', { date: props.startAt })}</td>
        </tr>
        <tr>
          <td>Date de fin</td>
          <td>{t('date.short', { date: props.endAt })}</td>
        </tr>
        <tr>
          <td>Nombre de représentations</td>
          <td>{props.eventsCount}</td>
        </tr>
        <tr>
          <td>Recette de billetterie HT</td>
          <td>
            {t('number.defaultWithNoGrouping', {
              number: getExcludingTaxesAmountFromIncludingTaxesAmount(props.totalIncludingTaxesAmount, props.taxRate),
            })}
          </td>
        </tr>
        <tr>
          <td>Recette de billetterie TTC</td>
          <td>{t('number.defaultWithNoGrouping', { number: props.totalIncludingTaxesAmount })}</td>
        </tr>
        <tr>
          <td>Taux de TVA</td>
          <td>{t('number.defaultWithNoGrouping', { number: 100 * props.taxRate })}</td>
        </tr>
        <tr>
          <td>Montant de TVA</td>
          <td>
            {t('number.defaultWithNoGrouping', {
              number: getTaxAmountFromIncludingTaxesAmount(props.totalIncludingTaxesAmount, props.taxRate),
            })}
          </td>
        </tr>
        <tr>
          <td>Nombre d&apos;entrées payantes</td>
          <td>{props.paidTickets}</td>
        </tr>
        <tr>
          <td>Nombre d&apos;entrées gratuites</td>
          <td>{props.freeTickets}</td>
        </tr>
        <tr>
          <td>Nombre total d&apos;entrées</td>
          <td>{props.freeTickets + props.paidTickets}</td>
        </tr>
        <tr>
          <td>Tarif moyen du billet TTC</td>
          <td>{t('number.defaultWithNoGrouping', { number: props.averageTicketPrice })}</td>
        </tr>
      </tbody>
    </table>
  );
}
