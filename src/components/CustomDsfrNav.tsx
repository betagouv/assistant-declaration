'use client';

import { FrCxArg, fr } from '@codegouvfr/react-dsfr';
import { usePathname } from 'next/navigation';

import { CustomMenuItem } from '@ad/src/utils/menu';
import { hasPathnameThisMatch } from '@ad/src/utils/url';

export interface CustomDsfrNavProps {
  id: string;
  menu: CustomMenuItem[];
  ariaLabel: string;
  hideOnDesktop?: boolean;
}

export function CustomDsfrNav({ id, menu, ariaLabel, hideOnDesktop }: CustomDsfrNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={fr.cx('fr-nav', ...(hideOnDesktop ? ['fr-hidden-lg' as FrCxArg] : []))}
      id={id}
      role="navigation"
      aria-label={ariaLabel}
      data-fr-js-navigation="true"
    >
      <ul className={fr.cx('fr-nav__list')} style={{ flexDirection: 'column' }}>
        {menu.map((item, i) => (
          <li key={i} className={fr.cx('fr-nav__item')} data-fr-js-navigation-item="true">
            {'subitems' in item ? (
              <>
                <button className={fr.cx('fr-nav__btn')} aria-expanded={item.open} aria-controls={`menu-list-${i}`} data-fr-js-collapse-button="true">
                  {item.content}
                </button>
                <div className={fr.cx('fr-collapse', 'fr-menu', 'fr-collapse--expanded')} id={`menu-list-${i}`} data-fr-js-collapse={!item.open}>
                  <ul className={fr.cx('fr-menu__list')}>
                    {item.subitems.map((subitem, u) => {
                      if ('href' in subitem) {
                        return (
                          <li key={u}>
                            <a
                              className={fr.cx('fr-nav__link')}
                              href={subitem.href}
                              target="_self"
                              aria-current={hasPathnameThisMatch(pathname, subitem.href)}
                            >
                              {subitem.name}
                            </a>
                          </li>
                        );
                      } else {
                        return (
                          <li key={u}>
                            <button className={fr.cx('fr-nav__link')} onClick={subitem.onClick}>
                              {subitem.name}
                            </button>
                          </li>
                        );
                      }
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <>
                {'href' in item ? (
                  <a
                    key={i}
                    className={fr.cx('fr-nav__link')}
                    href={item.href}
                    target="_self"
                    aria-current={hasPathnameThisMatch(pathname, item.href)}
                  >
                    {item.content}
                  </a>
                ) : (
                  <button key={i} className={fr.cx('fr-nav__link')} onClick={item.onClick}>
                    {item.content}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
