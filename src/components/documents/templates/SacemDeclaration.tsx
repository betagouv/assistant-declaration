import { Table, TableCell, TableHeader, TableRow } from '@ag-media/react-pdf-table';
// import { fr } from '@codegouvfr/react-dsfr';
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import { StandardLayout } from '@ad/src/components/documents/layouts/StandardLayout';
import { layoutStyles, styles } from '@ad/src/components/documents/layouts/standard';
import { getExcludingTaxesAmountFromIncludingTaxesAmount, getTaxAmountFromIncludingTaxesAmount } from '@ad/src/core/declaration';
import { useServerTranslation } from '@ad/src/i18n/index';
import { SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
import { escapeFormattedNumberForPdf } from '@ad/src/utils/pdf';
import { getBaseUrl } from '@ad/src/utils/url';

const sacemStyles = StyleSheet.create({
  header: {
    ...layoutStyles.header,
    paddingBottom: '3vw',
  },
});

export interface SacemDeclarationDocumentProps {
  sacemDeclaration: SacemDeclarationSchemaType;
  signatory: string;
}

export function SacemDeclarationDocument(props: SacemDeclarationDocumentProps) {
  const { t } = useServerTranslation('common');
  const title = `Déclaration SACEM - ${props.sacemDeclaration.eventSerieName}`;

  // // [WORKAROUND] After upgrading to Next.js v15 we wanted to avoid transpiling the entire `react-dsfr`
  // // This was needed only for the `pages` directory, so since just using a few hexadecimals, for now we prefer to hardcode them
  // // until the library is fully compatible, or if we switch over handlers into the app dir
  // const theme = fr.colors.getHex({ isDark: false });
  const theme = {
    decisions: {
      background: {
        default: { grey: { default: '#ffffff' } },
        alt: { blueFrance: { default: '#f5f5fe' } },
      },
    },
  };

  return (
    <StandardLayout
      title={title}
      header={
        <View style={{ ...sacemStyles.header, paddingBottom: '0vw' }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={`${getBaseUrl()}/assets/images/declaration/sacem_logo.png`} style={{ ...layoutStyles.headerLogo, maxHeight: '6vw' }} />
          <View style={layoutStyles.headerDescription}>
            <Text style={layoutStyles.headerSubtitle}>SACEM - Société des Auteurs, Compositeurs et Éditeurs de Musique</Text>
            <Text style={layoutStyles.headerSubtitle}>225 avenue Charles de Gaulle, 92528 Neuilly-sur-Seine Cedex</Text>
            <Text style={layoutStyles.headerSubtitle}>
              <Link src="https://www.sacem.fr">www.sacem.fr</Link> - Tél. <Link src="tel:+33147154715">01 47 15 47 15</Link>
            </Text>
            <Text style={{ ...layoutStyles.headerSubtitle, fontSize: 9, fontStyle: 'italic', marginTop: 5 }}>
              Ce document doit être adressé à votre délégation Sacem avant le dernier jour du mois suivant la dernière représentation du spectacle.
            </Text>
          </View>
        </View>
      }
    >
      <Text style={styles.h1}>État des recettes et dépenses</Text>
      <Text style={styles.h2}>Informations sur la structure</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Organisateur / Structure</Text>
          <Text>{props.sacemDeclaration.organizationName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>N° de client</Text>
          <Text>{props.sacemDeclaration.clientId}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Intitulé du lieu de représentation</Text>
          <Text>{props.sacemDeclaration.placeName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Code postal du lieu de représentation</Text>
          <Text>{props.sacemDeclaration.placePostalCode}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Jauge</Text>
          <Text>
            {escapeFormattedNumberForPdf(
              t('number.default', {
                number: props.sacemDeclaration.placeCapacity,
              })
            )}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Personne en charge</Text>
          <Text>{props.sacemDeclaration.managerName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Qualité</Text>
          <Text>{props.sacemDeclaration.managerTitle}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Informations sur le spectacle</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nom du spectacle</Text>
          <Text>{props.sacemDeclaration.eventSerieName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Date</Text>
          <Text>
            {t('date.short', { date: props.sacemDeclaration.eventSerieStartAt })} →{' '}
            {t('date.short', {
              date: props.sacemDeclaration.eventSerieEndAt,
            })}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nombre de représentations</Text>
          <Text>
            {escapeFormattedNumberForPdf(
              t('number.default', {
                number: props.sacemDeclaration.eventsCount,
              })
            )}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Genre du spectacle</Text>
          <Text>{props.sacemDeclaration.performanceType}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Recettes</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nombre d&apos;entrées payantes</Text>
          <Text>
            {escapeFormattedNumberForPdf(
              t('number.default', {
                number: props.sacemDeclaration.paidTickets,
              })
            )}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nombre d&apos;entrées gratuites</Text>
          <Text>
            {escapeFormattedNumberForPdf(
              t('number.default', {
                number: props.sacemDeclaration.freeTickets,
              })
            )}
          </Text>
        </View>
        <View style={{ ...styles.gridItem, paddingTop: 10 }}>
          <Table weightings={[2, 1, 1, 1, 1]} tdStyle={{ padding: 5 }}>
            <TableHeader fixed>
              <TableCell>Origine des recettes</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Taux de TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant HT</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant de la TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant TTC</TableCell>
            </TableHeader>
            {props.sacemDeclaration.revenues.map((revenue, index) => (
              <TableRow
                key={index}
                style={{
                  backgroundColor:
                    index % 2 === 0 ? theme.decisions.background.alt.blueFrance.default : theme.decisions.background.default.grey.default,
                }}
              >
                <TableCell>{revenue.categoryPrecision ?? t(`model.sacemDeclaration.accountingCategory.enum.${revenue.category}`)}</TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(
                    t('number.percent', {
                      percentage: revenue.taxRate,
                    })
                  )}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(
                    t('currency.amount', { amount: getExcludingTaxesAmountFromIncludingTaxesAmount(revenue.includingTaxesAmount, revenue.taxRate) })
                  )}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(
                    t('currency.amount', { amount: getTaxAmountFromIncludingTaxesAmount(revenue.includingTaxesAmount, revenue.taxRate) })
                  )}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(t('currency.amount', { amount: revenue.includingTaxesAmount }))}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </View>
      </View>
      <Text style={styles.h2}>Dépenses artistiques</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Table weightings={[2, 1, 1, 1, 1]} tdStyle={{ padding: 5 }}>
            <TableHeader fixed>
              <TableCell>Type de contrat</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Taux de TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant HT</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant de la TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant TTC</TableCell>
            </TableHeader>
            {props.sacemDeclaration.expenses.map((expense, index) => (
              <TableRow
                key={index}
                style={{
                  backgroundColor:
                    index % 2 === 0 ? theme.decisions.background.alt.blueFrance.default : theme.decisions.background.default.grey.default,
                }}
              >
                <TableCell>{expense.categoryPrecision ?? t(`model.sacemDeclaration.accountingCategory.enum.${expense.category}`)}</TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(
                    t('number.percent', {
                      percentage: expense.taxRate,
                    })
                  )}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(
                    t('currency.amount', { amount: getExcludingTaxesAmountFromIncludingTaxesAmount(expense.includingTaxesAmount, expense.taxRate) })
                  )}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(
                    t('currency.amount', { amount: getTaxAmountFromIncludingTaxesAmount(expense.includingTaxesAmount, expense.taxRate) })
                  )}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(t('currency.amount', { amount: expense.includingTaxesAmount }))}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </View>
      </View>
      <View style={styles.gridContainer}>
        <View style={{ ...styles.gridItem, textAlign: 'right', paddingRight: '6vw', paddingTop: 10 }}>
          <Text>Je certifie l&apos;exactitude des renseignements ci-dessus.</Text>
          <Text style={{ marginTop: 10 }}>
            Fait à {props.sacemDeclaration.declarationPlace}, le {t('date.short', { date: new Date() })}
          </Text>
          <Text
            style={{
              fontFamily: 'Dancing Script',
              fontSize: 35,
              marginTop: 10,
              marginRight: 10,
            }}
          >
            {props.signatory}
          </Text>
        </View>
      </View>
    </StandardLayout>
  );
}
