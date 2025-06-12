import { headerFooterDisplayItem } from '@codegouvfr/react-dsfr/Display';
import { HeaderProps } from '@codegouvfr/react-dsfr/Header';
import type { DefaultColorScheme } from '@codegouvfr/react-dsfr/next-appdir';
import { EventEmitter } from 'eventemitter3';

import { HeaderHelpItem } from '@ad/src/components/HeaderHelpItem';
import { HeaderUserItem } from '@ad/src/components/HeaderUserItem';
import { UserInterfaceOrganizationSchemaType } from '@ad/src/models/entities/ui';
import { TokenUserSchemaType } from '@ad/src/models/entities/user';

export const defaultColorScheme: DefaultColorScheme = 'system';

export const brandTop = (
  <>
    République
    <br />
    Française
  </>
);

export const homeLinkProps = {
  // TODO: as for other items, waiting for the following to be solved https://github.com/zilch/type-route/issues/125
  // href: linkRegistry.get('dashboard', undefined),
  href: '/dashboard',
  title: 'À propos - Assistant déclaration',
};

export const helpQuickAccessItem = (): HeaderProps.QuickAccessItem => {
  const eventEmitter = new EventEmitter();

  // INFORMATION: this won't work on 5xx and 4xx error pages since there is an hydratation error due to Next.js (maybe fixed in the future)
  // `Warning: validateDOMNesting(...): <body> cannot appear as a child of <div>.`
  return {
    iconId: 'fr-icon-questionnaire-line',
    buttonProps: {
      onClick: (event) => {
        eventEmitter.emit('click', event);
      },
    },
    text: <HeaderHelpItem eventEmitter={eventEmitter} />,
  };
};

export const userQuickAccessItem = (
  user: TokenUserSchemaType,
  currentOrganization: UserInterfaceOrganizationSchemaType | null
): HeaderProps.QuickAccessItem => {
  const eventEmitter = new EventEmitter();

  // INFORMATION: this won't work on 5xx and 4xx error pages since there is an hydratation error due to Next.js (maybe fixed in the future)
  // `Warning: validateDOMNesting(...): <body> cannot appear as a child of <div>.`
  return {
    iconId: 'fr-icon-account-circle-fill',
    buttonProps: {
      onClick: (event) => {
        eventEmitter.emit('click', event);
      },
    },
    text: <HeaderUserItem user={user} currentOrganization={currentOrganization} eventEmitter={eventEmitter} />,
  };
};

export const commonHeaderAttributes = {
  brandTop: brandTop,
  homeLinkProps: homeLinkProps,
  serviceTitle: 'Assistant déclaration',
  serviceTagline: 'Pour les entrepreneurs du spectacle vivant',
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
        // href: linkRegistry.get('termsOfUse', undefined),
        href: '/modalites-d-utilisation',
      },
      text: `Modalités d'utilisation`,
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
