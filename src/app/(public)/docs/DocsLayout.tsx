'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { SideMenu } from '@codegouvfr/react-dsfr/SideMenu';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

import '@ad/src/app/(public)/docs/layout.scss';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { hasPathnameThisMatch } from '@ad/src/utils/url';

export function DocsLayout(props: PropsWithChildren) {
  const pathname = usePathname();

  const docsBilletwebConnectionLink = linkRegistry.get('docsBilletwebConnection', undefined);
  const docsHelloassoConnectionLink = linkRegistry.get('docsHelloassoConnection', undefined);
  const docsMapadoConnectionLink = linkRegistry.get('docsMapadoConnection', undefined);
  const docsSoticketConnectionLink = linkRegistry.get('docsSoticketConnection', undefined);
  const docsSupersoniksConnectionLink = linkRegistry.get('docsSupersoniksConnection', undefined);
  const docsTicketingApiUsageLink = linkRegistry.get('docsTicketingApiUsage', undefined);

  const docsBilletwebConnectionLinkActive = hasPathnameThisMatch(pathname, docsBilletwebConnectionLink);
  const docsHelloassoConnectionLinkActive = hasPathnameThisMatch(pathname, docsHelloassoConnectionLink);
  const docsMapadoConnectionLinkActive = hasPathnameThisMatch(pathname, docsMapadoConnectionLink);
  const docsSoticketConnectionLinkActive = hasPathnameThisMatch(pathname, docsSoticketConnectionLink);
  const docsSupersoniksConnectionLinkActive = hasPathnameThisMatch(pathname, docsSupersoniksConnectionLink);
  const docsTicketingApiUsageLinkActive = hasPathnameThisMatch(pathname, docsTicketingApiUsageLink);

  return (
    <>
      <div className={fr.cx('fr-container')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--center', 'fr-py-8v')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
            <SideMenu
              title="Documentation"
              align="left"
              sticky={true}
              burgerMenuButtonText="Dans cette documentation"
              items={[
                {
                  text: 'Pour les déclarants',
                  expandedByDefault:
                    docsBilletwebConnectionLinkActive ||
                    docsHelloassoConnectionLinkActive ||
                    docsMapadoConnectionLinkActive ||
                    docsSoticketConnectionLinkActive ||
                    docsSupersoniksConnectionLinkActive,
                  items: [
                    {
                      isActive: docsBilletwebConnectionLinkActive,
                      text: 'Comment connecter Billetweb ?',
                      linkProps: {
                        href: docsBilletwebConnectionLink,
                      },
                    },
                    {
                      isActive: docsHelloassoConnectionLinkActive,
                      text: 'Comment connecter HelloAsso ?',
                      linkProps: {
                        href: docsHelloassoConnectionLink,
                      },
                    },
                    {
                      isActive: docsMapadoConnectionLinkActive,
                      text: 'Comment connecter Mapado ?',
                      linkProps: {
                        href: docsMapadoConnectionLink,
                      },
                    },
                    {
                      isActive: docsSoticketConnectionLinkActive,
                      text: 'Comment connecter SoTicket ?',
                      linkProps: {
                        href: docsSoticketConnectionLink,
                      },
                    },
                    {
                      isActive: docsSupersoniksConnectionLinkActive,
                      text: 'Comment connecter Supersoniks ?',
                      linkProps: {
                        href: docsSupersoniksConnectionLink,
                      },
                    },
                  ],
                },
                {
                  text: 'Pour les éditeurs de billetterie',
                  expandedByDefault: docsTicketingApiUsageLinkActive,
                  items: [
                    {
                      isActive: docsTicketingApiUsageLinkActive,
                      text: 'Introduction',
                      linkProps: {
                        href: docsTicketingApiUsageLink,
                      },
                    },
                  ],
                },
              ]}
            />
          </div>
          <div className={fr.cx('fr-col-12', 'fr-col-md-8')}>{props.children}</div>
        </div>
      </div>
    </>
  );
}
