import { Table, TableCell, TableHeader, TableRow } from '@ag-media/react-pdf-table';
// import { fr } from '@codegouvfr/react-dsfr';
import addressFormatter from '@fragaria/address-formatter';
import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';
import { default as libphonenumber } from 'google-libphonenumber';
import diff from 'microdiff';

import { StandardLayout, layoutStyles, styles } from '@ad/src/components/documents/layouts/StandardLayout';
import { useServerTranslation } from '@ad/src/i18n/index';
import { SacdDeclarationSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { escapeFormattedNumberForPdf } from '@ad/src/utils/pdf';
import { convertInputModelToGooglePhoneNumber } from '@ad/src/utils/phone';
import { getBaseUrl } from '@ad/src/utils/url';

const phoneNumberUtil = libphonenumber.PhoneNumberUtil.getInstance();

export const sacdStyles = StyleSheet.create({
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

  // To avoid duplicating data on the PDF
  const organizerProducerDiff = diff(props.sacdDeclaration.organizer, props.sacdDeclaration.producer);
  const producerRightsFeesManagerDiff = diff(props.sacdDeclaration.producer, props.sacdDeclaration.rightsFeesManager);
  const organizerRightsFeesManagerDiff = diff(props.sacdDeclaration.organizer, props.sacdDeclaration.rightsFeesManager);

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
        <View style={styles.gridItem}>
          <Text style={styles.label}>N° Siret</Text>
          <Text>{props.sacdDeclaration.officialHeadquartersId}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Votre spectacle</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Dossier d&apos;exploitation</Text>
          <Text>{props.sacdDeclaration.productionOperationId}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nature de l&apos;exploitation</Text>
          <Text>{t(`model.sacdDeclaration.productionType.enum.${props.sacdDeclaration.productionType}`)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Titre du spectacle</Text>
          <Text>{props.sacdDeclaration.eventSerieName}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Lieu de représentation</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Salle</Text>
          <Text>{props.sacdDeclaration.placeName}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Code postal</Text>
          <Text>{props.sacdDeclaration.placePostalCode}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Ville</Text>
          <Text>{props.sacdDeclaration.placeCity}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Déclaration de la billetterie</Text>
      <View style={styles.gridContainer}>
        <View style={{ ...styles.gridItem, flexBasis: '100%', paddingTop: 10, paddingBottom: 10 }}>
          <Table weightings={[2, 1, 2, 1.5, 1, 1, 1]} tdStyle={{ padding: 5 }}>
            <TableHeader fixed>
              <TableCell>Date et heure</TableCell>
              <TableCell style={{ justifyContent: 'flex-end' }}>Nombre</TableCell>
              <TableCell>Nature</TableCell>
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
                    {escapeFormattedNumberForPdf(
                      t('number.default', {
                        number: 1,
                      })
                    )}
                  </TableCell>
                  <TableCell>{t(`model.sacdDeclaration.audience.enum.${props.sacdDeclaration.audience}`)}</TableCell>
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
        <View style={styles.gridItem}>
          <Text style={styles.label}>Jauge théorique du spectacle</Text>
          <Text>
            {escapeFormattedNumberForPdf(
              t('number.default', {
                number: props.sacdDeclaration.placeCapacity,
              })
            )}
          </Text>
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
      <Text style={styles.h2}>Organisateur ou diffuseur</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Nom</Text>
          <Text>{props.sacdDeclaration.organizer.name}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Adresse</Text>
          <Text>
            {addressFormatter.format({
              street: props.sacdDeclaration.organizer.headquartersAddress.street,
              city: props.sacdDeclaration.organizer.headquartersAddress.city,
              postcode: props.sacdDeclaration.organizer.headquartersAddress.postalCode,
              state: props.sacdDeclaration.organizer.headquartersAddress.subdivision,
              countryCode: props.sacdDeclaration.organizer.headquartersAddress.countryCode,
            })}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Email</Text>
          <Text>{props.sacdDeclaration.organizer.email}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Téléphone</Text>
          <Link
            src={phoneNumberUtil.format(
              convertInputModelToGooglePhoneNumber(props.sacdDeclaration.organizer.phone),
              libphonenumber.PhoneNumberFormat.RFC3966
            )}
            style={styles.link}
          >
            {phoneNumberUtil.format(
              convertInputModelToGooglePhoneNumber(props.sacdDeclaration.organizer.phone),
              libphonenumber.PhoneNumberFormat.NATIONAL
            )}
          </Link>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Siret</Text>
          <Text>{props.sacdDeclaration.organizer.officialHeadquartersId}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>N° de TVA intracommunautaire</Text>
          <Text>{props.sacdDeclaration.organizer.europeanVatId}</Text>
        </View>
      </View>
      <Text style={styles.h2}>Producteur ou tourneur</Text>
      <View style={styles.gridContainer}>
        {organizerProducerDiff.length === 0 ? (
          <Text>
            Le producteur/tourneur est le même que l&apos;<Text style={{ fontWeight: 800 }}>organisateur/diffuseur.</Text>
          </Text>
        ) : (
          <>
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
            <View style={styles.gridItem}>
              <Text style={styles.label}>Email</Text>
              <Text>{props.sacdDeclaration.producer.email}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Téléphone</Text>
              <Link
                src={phoneNumberUtil.format(
                  convertInputModelToGooglePhoneNumber(props.sacdDeclaration.producer.phone),
                  libphonenumber.PhoneNumberFormat.RFC3966
                )}
                style={styles.link}
              >
                {phoneNumberUtil.format(
                  convertInputModelToGooglePhoneNumber(props.sacdDeclaration.producer.phone),
                  libphonenumber.PhoneNumberFormat.NATIONAL
                )}
              </Link>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Siret</Text>
              <Text>{props.sacdDeclaration.producer.officialHeadquartersId}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>N° de TVA intracommunautaire</Text>
              <Text>{props.sacdDeclaration.producer.europeanVatId}</Text>
            </View>
          </>
        )}
      </View>
      <Text style={styles.h2}>Organisme responsable du paiement des droits</Text>
      <View style={styles.gridContainer}>
        {organizerRightsFeesManagerDiff.length === 0 ? (
          <Text>
            L&apos;organisme responsable du paiement des droits est le même que l&apos;<Text style={{ fontWeight: 800 }}>organisateur/diffuseur</Text>
            .
          </Text>
        ) : (
          <>
            {producerRightsFeesManagerDiff.length === 0 ? (
              <Text>
                L&apos;organisme responsable du paiement des droits est le même que le <Text style={{ fontWeight: 800 }}>producteur/tourneur</Text>.
              </Text>
            ) : (
              <>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Nom</Text>
                  <Text>{props.sacdDeclaration.rightsFeesManager.name}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Adresse</Text>
                  <Text>
                    {addressFormatter.format({
                      street: props.sacdDeclaration.rightsFeesManager.headquartersAddress.street,
                      city: props.sacdDeclaration.rightsFeesManager.headquartersAddress.city,
                      postcode: props.sacdDeclaration.rightsFeesManager.headquartersAddress.postalCode,
                      state: props.sacdDeclaration.rightsFeesManager.headquartersAddress.subdivision,
                      countryCode: props.sacdDeclaration.rightsFeesManager.headquartersAddress.countryCode,
                    })}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Email</Text>
                  <Text>{props.sacdDeclaration.rightsFeesManager.email}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Téléphone</Text>
                  <Link
                    src={phoneNumberUtil.format(
                      convertInputModelToGooglePhoneNumber(props.sacdDeclaration.rightsFeesManager.phone),
                      libphonenumber.PhoneNumberFormat.RFC3966
                    )}
                    style={styles.link}
                  >
                    {phoneNumberUtil.format(
                      convertInputModelToGooglePhoneNumber(props.sacdDeclaration.rightsFeesManager.phone),
                      libphonenumber.PhoneNumberFormat.NATIONAL
                    )}
                  </Link>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Siret</Text>
                  <Text>{props.sacdDeclaration.rightsFeesManager.officialHeadquartersId}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>N° de TVA intracommunautaire</Text>
                  <Text>{props.sacdDeclaration.rightsFeesManager.europeanVatId}</Text>
                </View>
              </>
            )}
          </>
        )}
      </View>
      <Text style={styles.h2}>Œuvre(s) représentée(s)</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          {props.sacdDeclaration.performedWorks.length > 0 ? (
            <Table weightings={[1, 2, 2, 1]} tdStyle={{ padding: 5 }}>
              <TableHeader fixed>
                <TableCell>Discipline</TableCell>
                <TableCell>Titre</TableCell>
                <TableCell>Contributeurs</TableCell>
                <TableCell>Durée</TableCell>
              </TableHeader>
              {props.sacdDeclaration.performedWorks.map((performedWork, index) => {
                return (
                  <TableRow
                    key={index}
                    style={{
                      backgroundColor:
                        index % 2 === 0 ? theme.decisions.background.alt.blueFrance.default : theme.decisions.background.default.grey.default,
                    }}
                  >
                    <TableCell>{performedWork.category}</TableCell>
                    <TableCell>{performedWork.name}</TableCell>
                    <TableCell>{performedWork.contributors.join(', ')}</TableCell>
                    <TableCell>{t('duration.fromSeconds', { duration: performedWork.durationSeconds })}</TableCell>
                  </TableRow>
                );
              })}
            </Table>
          ) : (
            <Text>Aucune œuvre renseignée</Text>
          )}
        </View>
      </View>
      <View style={styles.gridContainer}>
        <View style={{ ...styles.gridItem, textAlign: 'right', paddingRight: '6vw', paddingTop: 10 }}>
          <Text>Je certifie l&apos;exactitude des renseignements ci-dessus.</Text>
          <Text style={{ marginTop: 10 }}>
            Fait à {props.sacdDeclaration.declarationPlace}, le {t('date.short', { date: new Date() })}
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
      <Text style={styles.h1} break>
        Annexes de billetterie
      </Text>
      {props.eventsWrappers.map((eventWrapper, wrapperIndex) => (
        <View key={wrapperIndex} style={{ width: '100%' }}>
          <Text style={styles.h2}>{capitalizeFirstLetter(t('date.longWithTime', { date: eventWrapper.event.startAt }))}</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              {eventWrapper.sales.length > 0 ? (
                <Table weightings={[2, 1, 1]} tdStyle={{ padding: 5 }}>
                  <TableHeader fixed>
                    <TableCell>Catégorie des tickets</TableCell>
                    <TableCell style={{ justifyContent: 'flex-end' }}>Prix unitaire TTC</TableCell>
                    <TableCell style={{ justifyContent: 'flex-end' }}>Nombre de billets vendus</TableCell>
                  </TableHeader>
                  {eventWrapper.sales.map((sale, index) => (
                    <TableRow
                      key={index}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? theme.decisions.background.alt.blueFrance.default : theme.decisions.background.default.grey.default,
                      }}
                    >
                      <TableCell>{sale.ticketCategory.name}</TableCell>
                      <TableCell style={{ justifyContent: 'flex-end' }}>
                        {escapeFormattedNumberForPdf(
                          t('currency.amount', { amount: sale.eventCategoryTickets.priceOverride ?? sale.ticketCategory.price })
                        )}
                      </TableCell>
                      <TableCell style={{ justifyContent: 'flex-end' }}>
                        {escapeFormattedNumberForPdf(
                          t('number.default', {
                            number: sale.eventCategoryTickets.totalOverride ?? sale.eventCategoryTickets.total,
                          })
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              ) : (
                <Text>Aucun billet n&apos;a été vendu pour cette séance.</Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </StandardLayout>
  );
}
