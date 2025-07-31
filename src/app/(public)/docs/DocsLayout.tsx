'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { SideMenu } from '@codegouvfr/react-dsfr/SideMenu';
import { usePathname } from 'next/navigation';
import { PropsWithChildren, useMemo } from 'react';

import '@ad/src/app/(public)/docs/layout.scss';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { hasPathnameThisMatch } from '@ad/src/utils/url';

export function DocsLayout(props: PropsWithChildren) {
  const pathname = usePathname();

  const docsBilletwebConnectionLink = linkRegistry.get('docsBilletwebConnection', undefined);
  const docsHelloassoConnectionLink = linkRegistry.get('docsHelloassoConnection', undefined);
  const docsMapadoConnectionLink = linkRegistry.get('docsMapadoConnection', undefined);
  const docsShotgunConnectionLink = linkRegistry.get('docsShotgunConnection', undefined);
  const docsSoticketConnectionLink = linkRegistry.get('docsSoticketConnection', undefined);
  const docsSupersoniksConnectionLink = linkRegistry.get('docsSupersoniksConnection', undefined);
  const docsTicketingApiUsageLink = linkRegistry.get('docsTicketingApiUsage', undefined);
  const docsTicketingApiDefinitionLink = linkRegistry.get('docsTicketingApiDefinition', undefined);

  const {
    docsBilletwebConnectionLinkActive,
    docsHelloassoConnectionLinkActive,
    docsMapadoConnectionLinkActive,
    docsShotgunConnectionLinkActive,
    docsSoticketConnectionLinkActive,
    docsSupersoniksConnectionLinkActive,
    docsTicketingApiUsageLinkActive,
    docsTicketingApiDefinitionLinkActive,
  } = useMemo(() => {
    return {
      docsBilletwebConnectionLinkActive: hasPathnameThisMatch(pathname, docsBilletwebConnectionLink),
      docsHelloassoConnectionLinkActive: hasPathnameThisMatch(pathname, docsHelloassoConnectionLink),
      docsMapadoConnectionLinkActive: hasPathnameThisMatch(pathname, docsMapadoConnectionLink),
      docsShotgunConnectionLinkActive: hasPathnameThisMatch(pathname, docsShotgunConnectionLink),
      docsSoticketConnectionLinkActive: hasPathnameThisMatch(pathname, docsSoticketConnectionLink),
      docsSupersoniksConnectionLinkActive: hasPathnameThisMatch(pathname, docsSupersoniksConnectionLink),
      docsTicketingApiUsageLinkActive: hasPathnameThisMatch(pathname, docsTicketingApiUsageLink),
      docsTicketingApiDefinitionLinkActive: hasPathnameThisMatch(pathname, docsTicketingApiDefinitionLink),
    };
  }, [pathname]);

  // A few pages need to be larger to due to content
  const widerContainer = useMemo(() => docsTicketingApiDefinitionLinkActive, [docsTicketingApiDefinitionLinkActive]);

  return (
    <>
      <div className={fr.cx('fr-container')} style={widerContainer ? { maxWidth: 2400 } : {}}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--center', 'fr-py-8v')}>
          <div className={widerContainer ? fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-3', 'fr-col-xl-2') : fr.cx('fr-col-12', 'fr-col-md-4')}>
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
                    docsShotgunConnectionLinkActive ||
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
                      isActive: docsShotgunConnectionLinkActive,
                      text: 'Comment connecter Shotgun ?',
                      linkProps: {
                        href: docsShotgunConnectionLink,
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
                  expandedByDefault: docsTicketingApiUsageLinkActive || docsTicketingApiDefinitionLinkActive,
                  items: [
                    {
                      isActive: docsTicketingApiUsageLinkActive,
                      text: 'Introduction',
                      linkProps: {
                        href: docsTicketingApiUsageLink,
                      },
                    },
                    {
                      isActive: docsTicketingApiDefinitionLinkActive,
                      text: `Spécifications de l'API`,
                      linkProps: {
                        href: docsTicketingApiDefinitionLink,
                      },
                    },
                  ],
                },
              ]}
            />
          </div>
          <div className={widerContainer ? fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-9', 'fr-col-xl-10') : fr.cx('fr-col-12', 'fr-col-md-8')}>
            {props.children}
          </div>
        </div>
      </div>
    </>
  );
}
