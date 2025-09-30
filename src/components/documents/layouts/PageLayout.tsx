import { Image, Link, Page, Text, View } from '@react-pdf/renderer';
import { Orientation } from '@react-pdf/types';
import React, { PropsWithChildren } from 'react';

import { layoutStyles as defaultLayoutStyles } from '@ad/src/components/documents/layouts/standard';
import { useServerTranslation } from '@ad/src/i18n';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { getBaseUrl } from '@ad/src/utils/url';

export interface PageLayoutProps {
  showHeader?: boolean;
  header?: React.JSX.Element;
  orientation?: Orientation;
  layoutStyles?: typeof defaultLayoutStyles;
}

export function PageLayout(props: PropsWithChildren<PageLayoutProps>) {
  const { t } = useServerTranslation('common');

  const layoutStyles = props.layoutStyles ?? defaultLayoutStyles;

  return (
    <Page size="A4" wrap style={layoutStyles.page} orientation={props.orientation ?? 'portrait'}>
      {props.showHeader && (
        <>
          {props.header ? (
            props.header
          ) : (
            <View style={layoutStyles.header}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={`${getBaseUrl()}/assets/images/logo.png`} style={layoutStyles.headerLogo} />
              <View style={layoutStyles.headerDescription}>
                <Link src={linkRegistry.get('home', undefined, { absolute: true })} style={layoutStyles.headerDescriptionLink}>
                  <Text style={layoutStyles.headerTitle}>Assistant déclaration</Text>
                  <Text style={layoutStyles.headerSubtitle}>Pour les entrepreneurs du spectacle vivant</Text>
                </Link>
              </View>
            </View>
          )}
        </>
      )}
      <View style={layoutStyles.content}>{props.children}</View>
      <View style={layoutStyles.footerSpacer} fixed></View>
      <View
        style={layoutStyles.footer}
        fixed
        render={({ pageNumber }) => {
          return (
            <>
              <View style={layoutStyles.footerItem}>
                {pageNumber === 1 && (
                  <>
                    {/* <Text style={{ ...layoutStyles.footerItemText, ...layoutStyles.footerItemTextWebsite }}>Généré par {linkRegistry.get('home', undefined, { absolute: true })}</Text> */}
                  </>
                )}
              </View>
              <View style={layoutStyles.footerItem}>
                <Text
                  style={{ ...layoutStyles.footerItemText, ...layoutStyles.footerItemTextPageNumber }}
                  render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                />
              </View>
              <View style={layoutStyles.footerItem}>
                {pageNumber === 1 && (
                  <Text style={{ ...layoutStyles.footerItemText, ...layoutStyles.footerItemTextCreatedDate }}>
                    {t('date.short', { date: new Date() })}
                  </Text>
                )}
              </View>
            </>
          );
        }}
      ></View>
    </Page>
  );
}
