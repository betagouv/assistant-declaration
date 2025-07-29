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

  const sampleLink = linkRegistry.get('docsSample', undefined);

  const sampleLinkActive = hasPathnameThisMatch(pathname, sampleLink);

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
                  text: 'Niveau 1',
                  expandedByDefault: sampleLinkActive,
                  items: [
                    {
                      isActive: sampleLinkActive,
                      text: 'Accès direct niveau 2',
                      linkProps: {
                        href: sampleLink,
                      },
                    },
                    {
                      text: 'Accès direct niveau 2',
                      linkProps: {
                        href: '#',
                      },
                    },
                    {
                      text: 'Accès direct niveau 2',
                      linkProps: {
                        href: '#',
                      },
                    },
                  ],
                },
                {
                  text: 'Niveau 2',
                  items: [
                    {
                      text: 'Accès direct niveau 2',
                      linkProps: {
                        href: '#',
                      },
                    },
                    {
                      text: 'Accès direct niveau 2',
                      linkProps: {
                        href: '#',
                      },
                    },
                    {
                      text: 'Accès direct niveau 2',
                      linkProps: {
                        href: '#',
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
