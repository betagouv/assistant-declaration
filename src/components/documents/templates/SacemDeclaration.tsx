import { Table, TableCell, TableHeader, TableRow } from '@ag-media/react-pdf-table';
import { fr } from '@codegouvfr/react-dsfr';
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import { StandardLayout, layoutStyles, styles } from '@ad/src/components/documents/layouts/StandardLayout';
import { useServerTranslation } from '@ad/src/i18n/index';
import { SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
import { currencyFormatter } from '@ad/src/utils/currency';
import { getBaseUrl } from '@ad/src/utils/url';

export const sacemStyles = StyleSheet.create({
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
  const theme = fr.colors.getHex({ isDark: false });
  const title = `Déclaration SACEM - ${props.sacemDeclaration.eventSerieName}`;

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
          <Text style={styles.label}>Nom de la salle</Text>
          <Text>{props.sacemDeclaration.placeName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Jauge</Text>
          <Text>{props.sacemDeclaration.placeCapacity}</Text>
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
          <Text>{props.sacemDeclaration.eventsCount}</Text>
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
          <Text>{props.sacemDeclaration.paidTickets}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nombre d&apos;entrées gratuites</Text>
          <Text>{props.sacemDeclaration.freeTickets}</Text>
        </View>
        <View style={{ ...styles.gridItem, paddingTop: 10 }}>
          <Table weightings={[2, 1, 1, 1, 1]} tdStyle={{ padding: 5 }}>
            <TableHeader fixed>
              <TableCell>Origine des recettes</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Taux de TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Recettes HT</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant de la TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Recettes TTC</TableCell>
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
                <TableCell style={{ justifyContent: 'flex-end' }}>{revenue.taxRate * 100}%</TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {currencyFormatter.format((1 - revenue.taxRate) * revenue.includingTaxesAmount)}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {currencyFormatter.format(revenue.taxRate * revenue.includingTaxesAmount)}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>{currencyFormatter.format(revenue.includingTaxesAmount)}</TableCell>
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
              <TableCell style={{ justifyContent: 'flex-end' }}>Recettes HT</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant de la TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Recettes TTC</TableCell>
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
                <TableCell style={{ justifyContent: 'flex-end' }}>{expense.taxRate * 100}%</TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {currencyFormatter.format((1 - expense.taxRate) * expense.includingTaxesAmount)}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {currencyFormatter.format(expense.taxRate * expense.includingTaxesAmount)}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>{currencyFormatter.format(expense.includingTaxesAmount)}</TableCell>
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
