import { headerFooterDisplayItem } from '@codegouvfr/react-dsfr/Display';
import type { DefaultColorScheme } from '@codegouvfr/react-dsfr/next-appdir';
import { BadgeProps } from '@mui/material/Badge';

export const defaultColorScheme: DefaultColorScheme = 'system';

export const brandTop = (
  <>
    République
    <br />
    Française
  </>
);

export const homeLinkProps = {
  href: '/',
  title: 'Présentation - Assistant déclaration',
};

export const commonHeaderAttributes = {
  brandTop: brandTop,
  homeLinkProps: homeLinkProps,
  serviceTitle: 'Assistant déclaration',
  serviceTagline: 'À destination des entrepreneurs du spectacle vivant',
};

export const commonFooterAttributes = {
  accessibility: 'non compliant' as any,
  accessibilityLinkProps: {
    // TODO: waiting for the following to be solved https://github.com/zilch/type-route/issues/125
    // href: linkRegistry.get('accessibility', undefined),
    href: '/accessibility',
  },
  brandTop: brandTop,
  homeLinkProps: homeLinkProps,
  termsLinkProps: {
    // href: linkRegistry.get('legalNotice', undefined),
    href: '/legal-notice',
  },
  // websiteMapLinkProps: {{
  //   href: '#',
  // }}
  bottomItems: [
    {
      iconId: undefined as any,
      linkProps: {
        // href: linkRegistry.get('privacyPolicy', undefined),
        href: '/privacy-policy',
      },
      text: 'Politique de confidentialité',
    },
    {
      iconId: undefined as any,
      linkProps: {
        href: 'https://github.com/betagouv/assistant-declaration',
        target: '_blank',
      },
      text: 'Code source',
    },
    headerFooterDisplayItem,
  ],
  license: (
    <>
      Sauf mention contraire, tous les contenus de ce site sont sous{' '}
      <a href="https://raw.githubusercontent.com/betagouv/assistant-declaration/main/LICENSE" target="_blank" rel="noreferrer">
        licence MIT
      </a>{' '}
    </>
  ),
};
