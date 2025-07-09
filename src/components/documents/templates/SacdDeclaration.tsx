import { Table, TableCell, TableHeader, TableRow } from '@ag-media/react-pdf-table';
// import { fr } from '@codegouvfr/react-dsfr';
import addressFormatter from '@fragaria/address-formatter';
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';
import { default as libphonenumber } from 'google-libphonenumber';

import { StandardLayout } from '@ad/src/components/documents/layouts/StandardLayout';
import { layoutStyles, styles } from '@ad/src/components/documents/layouts/standard';
import { useServerTranslation } from '@ad/src/i18n/index';
import { SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { escapeFormattedNumberForPdf } from '@ad/src/utils/pdf';
import { getBaseUrl } from '@ad/src/utils/url';

const phoneNumberUtil = libphonenumber.PhoneNumberUtil.getInstance();

const sacdStyles = StyleSheet.create({
  header: {
    ...layoutStyles.header,
    paddingBottom: '3vw',
  },
});

export interface SacdDeclarationDocumentProps {
  sacdDeclaration: SacdDeclarationSchemaType;
  eventsWrappers: EventWrapperSchemaType[];
  taxRate: number;
  signatory: string;
}

export function SacdDeclarationDocument(props: SacdDeclarationDocumentProps) {
  const { t } = useServerTranslation('common');
  const title = `Déclaration SACD - ${props.sacdDeclaration.eventSerieName}`;

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
        <View style={{ ...sacdStyles.header, paddingBottom: '0vw' }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={`${getBaseUrl()}/assets/images/declaration/sacd_logo.png`} style={{ ...layoutStyles.headerLogo, maxHeight: '6vw' }} />
          <View style={layoutStyles.headerDescription}>
            <Text style={layoutStyles.headerSubtitle}>SACD - Service Perception</Text>
            <Text style={layoutStyles.headerSubtitle}>12 rue Ballu, 75442 Paris Cedex 09</Text>
            <Text style={layoutStyles.headerSubtitle}>
              <Link src="https://www.sacd.fr">www.sacd.fr</Link> - Tél. <Link src="tel:+33140234455">01 40 23 44 55</Link>
            </Text>
            <Text style={{ ...layoutStyles.headerSubtitle, fontSize: 9, fontStyle: 'italic', marginTop: 5 }}>
              Si les représentations se sont déroulées en région, rendez-vous sur le site pour identifier votre interlocuteur SACD.
            </Text>
          </View>
        </View>
      }
    >
      <Text style={styles.h1}>Bordereau de recettes et/ou de dépenses</Text>
      <Text style={styles.h2}>Informations sur la structure</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Raison sociale de la structure</Text>
          <Text>{props.sacdDeclaration.organizationName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>N° identifiant SACD</Text>
          <Text>{props.sacdDeclaration.clientId}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Votre spectacle</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Titre du spectacle</Text>
          <Text>{props.sacdDeclaration.eventSerieName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nombre de représentations</Text>
          <Text>
            {escapeFormattedNumberForPdf(
              t('number.default', {
                number: props.eventsWrappers.length,
              })
            )}
          </Text>
        </View>
      </View>
      <Text style={styles.h2}>Lieu de représentation</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Intitulé</Text>
          <Text>{props.sacdDeclaration.placeName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Adresse</Text>
          <Text>
            {addressFormatter.format({
              street: props.sacdDeclaration.placeStreet,
              city: props.sacdDeclaration.placeCity,
              postcode: props.sacdDeclaration.placePostalCode,
            })}
          </Text>
        </View>
      </View>
      <Text style={styles.h2}>Déclaration de la billetterie</Text>
      <View style={styles.gridContainer}>
        <View style={{ ...styles.gridItem, flexBasis: '100%', paddingTop: 10, paddingBottom: 10 }}>
          <Table weightings={[2, 1.5, 1, 1, 1]} tdStyle={{ padding: 5 }}>
            <TableHeader fixed>
              <TableCell>Date et heure</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant TTC</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Taux de TVA</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Payant(s)</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Exonéré(s)</TableCell>
            </TableHeader>
            {props.eventsWrappers.map((eventWrapper, index) => {
              let freeTickets: number = 0;
              let paidTickets: number = 0;
              let includingTaxesAmount: number = 0;

              for (const sale of eventWrapper.sales) {
                const total = sale.eventCategoryTickets.totalOverride ?? sale.eventCategoryTickets.total;
                const price = sale.eventCategoryTickets.priceOverride ?? sale.ticketCategory.price;

                if (price === 0) {
                  freeTickets += total;
                } else {
                  paidTickets += total;
                  includingTaxesAmount += total * price;
                }
              }

              return (
                <TableRow
                  key={index}
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? theme.decisions.background.alt.blueFrance.default : theme.decisions.background.default.grey.default,
                  }}
                >
                  <TableCell>{capitalizeFirstLetter(t('date.shortWithTime', { date: eventWrapper.event.startAt }))}</TableCell>
                  <TableCell style={{ justifyContent: 'flex-end' }}>
                    {escapeFormattedNumberForPdf(t('currency.amount', { amount: includingTaxesAmount }))}
                  </TableCell>
                  <TableCell style={{ justifyContent: 'flex-end' }}>
                    {escapeFormattedNumberForPdf(
                      t('number.percent', {
                        percentage: props.taxRate,
                      })
                    )}
                  </TableCell>
                  <TableCell style={{ justifyContent: 'flex-end' }}>
                    {escapeFormattedNumberForPdf(
                      t('number.default', {
                        number: paidTickets,
                      })
                    )}
                  </TableCell>
                  <TableCell style={{ justifyContent: 'flex-end' }}>
                    {escapeFormattedNumberForPdf(
                      t('number.default', {
                        number: freeTickets,
                      })
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Tarif moyen du billet affiché pour le spectacle</Text>
          <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: props.sacdDeclaration.averageTicketPrice }))}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Prix de cession du droit d&apos;exploitation du spectacle</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Table weightings={[2, 1, 1, 1, 1]} tdStyle={{ padding: 5 }}>
            <TableHeader fixed>
              <TableCell>Type de dépense</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Montant TTC</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Taux de TVA</TableCell>
            </TableHeader>
            {props.sacdDeclaration.accountingEntries.map((accountingEntry, index) => (
              <TableRow
                key={index}
                style={{
                  backgroundColor:
                    index % 2 === 0 ? theme.decisions.background.alt.blueFrance.default : theme.decisions.background.default.grey.default,
                }}
              >
                <TableCell>
                  {accountingEntry.categoryPrecision ?? t(`model.sacdDeclaration.accountingCategory.enum.${accountingEntry.category}`)}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(t('currency.amount', { amount: accountingEntry.includingTaxesAmount }))}
                </TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>
                  {escapeFormattedNumberForPdf(
                    t('number.percent', {
                      percentage: accountingEntry.taxRate ?? 0,
                    })
                  )}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </View>
      </View>
      <Text style={styles.h2}>Producteur ou tourneur</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Siret</Text>
          <Text>{props.sacdDeclaration.producer.officialHeadquartersId}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nom</Text>
          <Text>{props.sacdDeclaration.producer.name}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Adresse</Text>
          <Text>
            {addressFormatter.format({
              street: props.sacdDeclaration.producer.headquartersAddress.street,
              city: props.sacdDeclaration.producer.headquartersAddress.city,
              postcode: props.sacdDeclaration.producer.headquartersAddress.postalCode,
              state: props.sacdDeclaration.producer.headquartersAddress.subdivision,
              countryCode: props.sacdDeclaration.producer.headquartersAddress.countryCode,
            })}
          </Text>
        </View>
      </View>
      <View style={styles.gridContainer}>
        <View style={{ ...styles.gridItem, textAlign: 'right', paddingRight: '6vw', paddingTop: 10 }}>
          <Text>Je certifie l&apos;exactitude des renseignements ci-dessus.</Text>
          <Text style={{ marginTop: 10 }}>Fait à le {t('date.short', { date: new Date() })}</Text>
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
