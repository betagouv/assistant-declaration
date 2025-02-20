import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { htmlToClipboard } from '@ad/src/utils/clipboard';

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
  onCopy?: () => void;
  preview?: boolean; // Just to demonstrate the result of this copy feature
}

export function ClipboardTicketingKeyFigures(props: ClipboardTicketingKeyFiguresProps) {
  const { t } = useTranslation();

  const wrapperRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    if (props.preview !== true && wrapperRef.current) {
      htmlToClipboard(wrapperRef.current.innerHTML).then(() => {
        props.onCopy && props.onCopy();
      });
    }
  }, []);

  return (
    <div ref={wrapperRef} style={props.preview === true ? {} : { display: 'none' }}>
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
            <td>Nombre d'entrées payantes</td>
            <td>{props.paidTickets}</td>
          </tr>
          <tr>
            <td>Nombre d'entrées gratuites</td>
            <td>{props.freeTickets}</td>
          </tr>
          <tr>
            <td>Nombre total d'entrées</td>
            <td>{props.freeTickets + props.paidTickets}</td>
          </tr>
          <tr>
            <td>Tarif moyen du billet TTC</td>
            <td>{t('number.defaultWithNoGrouping', { number: props.averageTicketPrice })}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
