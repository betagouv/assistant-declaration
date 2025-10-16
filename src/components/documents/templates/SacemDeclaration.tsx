import { Table, TableCell, TableHeader, TableRow } from '@ag-media/react-pdf-table';
import addressFormatter from '@fragaria/address-formatter';
// import { fr } from '@codegouvfr/react-dsfr';
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import { PageLayout } from '@ad/src/components/documents/layouts/PageLayout';
import { StandardLayout } from '@ad/src/components/documents/layouts/StandardLayout';
import { layoutStyles, styles } from '@ad/src/components/documents/layouts/standard';
import { getTaxAmountFromIncludingAndExcludingTaxesAmounts } from '@ad/src/core/declaration';
import { getEventsKeyFigures, getFlattenEventsForSacemDeclaration, getSacemEventsKeyFigures } from '@ad/src/core/declaration/format';
import { useServerTranslation } from '@ad/src/i18n/index';
import { SacemDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacem';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { escapeFormattedNumberForPdf } from '@ad/src/utils/pdf';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { getBaseUrl } from '@ad/src/utils/url';

const sacemLayoutStyles = StyleSheet.create({
  ...layoutStyles,
  header: {
    ...layoutStyles.header,
    paddingBottom: '3vw',
  },
});

const sacemTableLayoutStyles = StyleSheet.create({
  ...layoutStyles,
  page: {
    ...layoutStyles.page,
    padding: '2vw 2vw 2vw 2vw',
  },
  content: {
    ...layoutStyles.content,
    fontSize: 10,
    paddingHorizontal: '0vw',
    paddingTop: '0vw',
  },
  invisibleLastRowCell: {
    // The following is the best way to keep things aligned since using color on borders was not working due to overlapping with others
    border: 0,
    marginTop: 1,
    marginLeft: 1,
  },
  totalCell: {
    fontWeight: 800,
    backgroundColor: '#f4be30', // [WORKAROUND] Harcoded from `theme` since it has to be constructed by `StyleSheet.create`
  },
});

export interface SacemDeclarationDocumentProps {
  sacemDeclaration: SacemDeclarationSchemaType;
  signatory: string;
}

export function SacemDeclarationDocument(props: SacemDeclarationDocumentProps) {
  const { t } = useServerTranslation('common');
  const title = `Déclaration Sacem - ${props.sacemDeclaration.eventSerie.name}`;

  assert(props.sacemDeclaration.events.length > 0, 'no event has no meaning');

  const flattenEvents = getFlattenEventsForSacemDeclaration(props.sacemDeclaration);
  const flattenEventsKeyFigures = getEventsKeyFigures(flattenEvents);
  const extraKeyFigures = getSacemEventsKeyFigures(flattenEvents);

  const ascendingFlattenEvents = flattenEvents.sort((a, b) => +a.startAt - +b.startAt);
  const firstEvent = ascendingFlattenEvents[0];
  const lastEvent = ascendingFlattenEvents[ascendingFlattenEvents.length - 1];

  // // [WORKAROUND] After upgrading to Next.js v15 we wanted to avoid transpiling the entire `react-dsfr`
  // // This was needed only for the `pages` directory, so since just using a few hexadecimals, for now we prefer to hardcode them
  // // until the library is fully compatible, or if we switch over handlers into the app dir
  // const theme = fr.colors.getHex({ isDark: false });
  const theme = {
    decisions: {
      background: {
        default: { grey: { default: '#ffffff' } },
        alt: { blueFrance: { default: '#f5f5fe' } },
        contrast: { yellowMoutarde: { active: ' #f4be30' } },
      },
    },
  };

  return (
    <StandardLayout title={title}>
      <PageLayout
        showHeader
        header={
          <View style={{ ...sacemLayoutStyles.header, paddingBottom: '0vw' }}>
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
            <Text>{props.sacemDeclaration.organization.name}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>N° client</Text>
            <Text>{props.sacemDeclaration.organization.sacemId}</Text>
          </View>
        </View>
        <Text style={styles.h2}>Informations sur le spectacle</Text>
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Nom du spectacle</Text>
            <Text>{props.sacemDeclaration.eventSerie.name}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Date</Text>
            <Text>
              {t('date.short', { date: firstEvent.startAt })} →{' '}
              {t('date.short', {
                date: lastEvent.startAt,
              })}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Nombre de représentations</Text>
            <Text>
              {escapeFormattedNumberForPdf(
                t('number.default', {
                  number: props.sacemDeclaration.events.length,
                })
              )}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Genre du spectacle</Text>
            <Text>{t(`model.performanceType.enum.${props.sacemDeclaration.eventSerie.performanceType}`)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Recette billetterie HT</Text>
            <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEventsKeyFigures.ticketingRevenueExcludingTaxes }))}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Recette billetterie TTC</Text>
            <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEventsKeyFigures.ticketingRevenueIncludingTaxes }))}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Recette hors-billetterie HT</Text>
            <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: extraKeyFigures.nonTicketingRevenueExcludingTaxes }))}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Recette hors-billetterie TTC</Text>
            <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: extraKeyFigures.nonTicketingRevenueIncludingTaxes }))}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Dépenses totales HT</Text>
            <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: props.sacemDeclaration.eventSerie.expensesExcludingTaxes }))}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Dépenses totales TTC</Text>
            <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: props.sacemDeclaration.eventSerie.expensesIncludingTaxes }))}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Frais d&apos;approche HT</Text>
            <Text>
              {escapeFormattedNumberForPdf(
                t('currency.amount', { amount: props.sacemDeclaration.eventSerie.introductionFeesExpensesExcludingTaxes })
              )}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Frais d&apos;approche TTC</Text>
            <Text>
              {escapeFormattedNumberForPdf(
                t('currency.amount', { amount: props.sacemDeclaration.eventSerie.introductionFeesExpensesIncludingTaxes })
              )}
            </Text>
          </View>
        </View>
        <View style={styles.gridContainer}>
          <View style={{ ...styles.gridItem, textAlign: 'right', paddingRight: '6vw', paddingTop: 10 }}>
            <Text>Je certifie l&apos;exactitude des renseignements ci-joint.</Text>
            <Text style={{ marginTop: 10 }}>
              Fait via <Link src={linkRegistry.get('home', undefined, { absolute: true })}>l&apos;Assistant déclaration</Link>, le{' '}
              {t('date.short', { date: new Date() })}
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
      </PageLayout>
      <PageLayout orientation="landscape" layoutStyles={sacemTableLayoutStyles}>
        <Text style={styles.h4}>Représentations - {props.sacemDeclaration.eventSerie.name}</Text>
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Table weightings={[2.7, 1.2, 2.7, 1.45, 0.8, 1, 1, 2, 2]} tdStyle={{ padding: 5 }}>
              <TableHeader fixed>
                <TableCell>Date et heure</TableCell>
                <TableCell>Audience</TableCell>
                <TableCell>Lieu</TableCell>
                <TableCell>Entrées</TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>Jauge</TableCell>
                {/* <TableCell style={{ justifyContent: 'flex-end' }}>Taux de TVA</TableCell> */}
                <TableCell style={{ justifyContent: 'flex-end' }}>Billetterie HT</TableCell>
                {/* <TableCell style={{ justifyContent: 'flex-end' }}>Montant de la TVA</TableCell> */}
                <TableCell style={{ justifyContent: 'flex-end' }}>Billetterie TTC</TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>Hors-billetterie HT</TableCell>
                <TableCell style={{ justifyContent: 'flex-end' }}>Hors-billetterie TTC</TableCell>
              </TableHeader>
              {ascendingFlattenEvents.map((flattenEvent, index) => (
                <TableRow
                  key={index}
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? theme.decisions.background.alt.blueFrance.default : theme.decisions.background.default.grey.default,
                  }}
                >
                  <TableCell>
                    <Text>{capitalizeFirstLetter(t('date.longWithTime', { date: flattenEvent.startAt }))}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{t(`model.audience.enum.${flattenEvent.audience}`)}</Text>
                  </TableCell>
                  <TableCell>
                    <View>
                      <Text>{flattenEvent.place.name}</Text>
                      <Text>
                        {addressFormatter.format({
                          street: flattenEvent.place.address.street,
                          city: flattenEvent.place.address.city,
                          postcode: flattenEvent.place.address.postalCode,
                          state: flattenEvent.place.address.subdivision,
                          countryCode: flattenEvent.place.address.countryCode,
                        })}
                      </Text>
                    </View>
                  </TableCell>
                  <TableCell>
                    <View>
                      <Text>{flattenEvent.paidTickets} gratuites</Text>
                      <Text>{flattenEvent.freeTickets} payantes</Text>
                    </View>
                  </TableCell>
                  <TableCell style={{ justifyContent: 'flex-end' }}>
                    <Text>{flattenEvent.placeCapacity}</Text>
                  </TableCell>
                  {/* <TableCell style={{ justifyContent: 'flex-end' }}>
                    <Text>
                      {flattenEvent.ticketingRevenueTaxRate !== null
                        ? escapeFormattedNumberForPdf(
                            t('number.percent', {
                              percentage: flattenEvent.ticketingRevenueTaxRate,
                            })
                          )
                        : '-'}
                    </Text>
                  </TableCell> */}
                  <TableCell style={{ justifyContent: 'flex-end' }}>
                    <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.ticketingRevenueExcludingTaxes }))}</Text>
                  </TableCell>
                  {/* <TableCell style={{ justifyContent: 'flex-end' }}>
                    <Text>
                      {escapeFormattedNumberForPdf(
                        t('currency.amount', {
                          amount: getTaxAmountFromIncludingAndExcludingTaxesAmounts(
                            flattenEvent.ticketingRevenueIncludingTaxes,
                            flattenEvent.ticketingRevenueExcludingTaxes
                          ),
                        })
                      )}
                    </Text>
                  </TableCell> */}
                  <TableCell style={{ justifyContent: 'flex-end' }}>
                    <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.ticketingRevenueIncludingTaxes }))}</Text>
                  </TableCell>
                  <TableCell>
                    <View style={{ width: '100%', textAlign: 'right' }}>
                      <Text>
                        Conso. {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.consumptionsRevenueExcludingTaxes }))}
                      </Text>
                      <Text>Rest. {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.cateringRevenueExcludingTaxes }))}</Text>
                      <Text>
                        Prog. {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.programSalesRevenueExcludingTaxes }))}
                      </Text>
                      <Text>Autre {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.otherRevenueExcludingTaxes }))}</Text>
                    </View>
                  </TableCell>
                  <TableCell>
                    <View style={{ width: '100%', textAlign: 'right' }}>
                      <Text>
                        Conso. {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.consumptionsRevenueIncludingTaxes }))}
                      </Text>
                      <Text>Rest. {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.cateringRevenueIncludingTaxes }))}</Text>
                      <Text>
                        Prog. {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.programSalesRevenueIncludingTaxes }))}
                      </Text>
                      <Text>Autre {escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEvent.otherRevenueIncludingTaxes }))}</Text>
                    </View>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                {/* colspan usage is not possible and weighting is not working properly, so using hidden unit cells to achieve the total row */}
                <TableCell style={sacemTableLayoutStyles.invisibleLastRowCell}></TableCell>
                <TableCell style={sacemTableLayoutStyles.invisibleLastRowCell}></TableCell>
                <TableCell style={sacemTableLayoutStyles.invisibleLastRowCell}></TableCell>
                <TableCell style={sacemTableLayoutStyles.totalCell}>
                  <View>
                    <Text>{flattenEventsKeyFigures.paidTickets} gratuites</Text>
                    <Text>{flattenEventsKeyFigures.freeTickets} payantes</Text>
                  </View>
                </TableCell>
                <TableCell style={sacemTableLayoutStyles.invisibleLastRowCell}></TableCell>
                {/* <TableCell style={sacemTableLayoutStyles.invisibleLastRowCell}></TableCell> */}
                <TableCell style={{ ...sacemTableLayoutStyles.totalCell, justifyContent: 'flex-end' }}>
                  <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEventsKeyFigures.ticketingRevenueExcludingTaxes }))}</Text>
                </TableCell>
                {/* <TableCell style={{ ...sacemTableLayoutStyles.totalCell, justifyContent: 'flex-end' }}>
                  <Text>
                    {escapeFormattedNumberForPdf(
                      t('currency.amount', {
                        amount: flattenEventsKeyFigures.ticketingRevenueTaxes,
                      })
                    )}
                  </Text>
                </TableCell> */}
                <TableCell style={{ ...sacemTableLayoutStyles.totalCell, justifyContent: 'flex-end' }}>
                  <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: flattenEventsKeyFigures.ticketingRevenueIncludingTaxes }))}</Text>
                </TableCell>
                <TableCell style={{ ...sacemTableLayoutStyles.totalCell, justifyContent: 'flex-end' }}>
                  <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: extraKeyFigures.nonTicketingRevenueExcludingTaxes }))}</Text>
                </TableCell>
                <TableCell style={{ ...sacemTableLayoutStyles.totalCell, justifyContent: 'flex-end' }}>
                  <Text>{escapeFormattedNumberForPdf(t('currency.amount', { amount: extraKeyFigures.nonTicketingRevenueIncludingTaxes }))}</Text>
                </TableCell>
              </TableRow>
            </Table>
          </View>
        </View>
      </PageLayout>
    </StandardLayout>
  );
}
