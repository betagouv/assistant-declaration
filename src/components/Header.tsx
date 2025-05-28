//
// [IMPORTANT] We had to reuse a copy of the `react-dsfr` header to fit the adapated of for the mobile menu
// inside the `MainNavigation` component included by the header. Replacing imports would have been too much mess
//

/* eslint-disable no-inner-declarations */
import { FrIconClassName, RiIconClassName, fr } from '@codegouvfr/react-dsfr';
import { Display } from '@codegouvfr/react-dsfr/Display/Display';
import { HeaderProps, HeaderQuickAccessItem, useTranslation } from '@codegouvfr/react-dsfr/Header';
import { headerMenuModalIdPrefix } from '@codegouvfr/react-dsfr/Header/Header';
import { MainNavigation } from '@codegouvfr/react-dsfr/MainNavigation';
import { useTranslation as useSearchBarTranslation } from '@codegouvfr/react-dsfr/SearchBar/SearchBar';
import { SearchButton } from '@codegouvfr/react-dsfr/SearchBar/SearchButton';
import { getLink } from '@codegouvfr/react-dsfr/link';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import { setBrandTopAndHomeLinkProps } from '@codegouvfr/react-dsfr/zz_internal/brandTopAndHomeLinkProps';
import { usePathname } from 'next/navigation';
import { cloneElement, forwardRef, memo } from 'react';
import type { Equals } from 'tsafe';
import { assert } from 'tsafe/assert';
import { symToStr } from 'tsafe/symToStr';
import { typeGuard } from 'tsafe/typeGuard';

import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';
import { UserInterfaceOrganizationSchemaType } from '@ad/src/models/entities/ui';
import { logout } from '@ad/src/utils/auth';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { hasPathnameThisMatch } from '@ad/src/utils/url';

// type Test = {name: string} & ({a:true; coucou: string} | {b:true});

// const c: Test[] = [{name: '', a: true, coucou:'toi'}];

// const d = c[0];

// d.a;
// if ('a' in d) {
//   d.a
//   d.coucou
// }

export type CustomMenuItemHrefAction = {
  href: string;
};

export type CustomMenuItemOnClickAction = {
  onClick: () => void;
};
export type CustomMenuItemActions = CustomMenuItemOnClickAction | CustomMenuItemHrefAction;

export type CustomMenuItem = {
  content: string | JSX.Element;
  icon?: FrIconClassName | RiIconClassName;
} & (
  | CustomMenuItemActions
  | {
      open: boolean;
      subitems: ({
        name: string;
      } & CustomMenuItemActions)[];
    }
);

function hasSubitems(item: CustomMenuItem): item is CustomMenuItem & {
  subitems: ({
    name: string;
  } & CustomMenuItemActions)[];
} {
  return 'subitems' in item && Array.isArray(item.subitems);
}

// function hasItemHref(item: { content: string } & CustomMenuItemActions): item is { content: string } & CustomMenuItemHrefAction {
//   return typeof (item as any).href === 'string';
// }

// function hasSubitemHref(subitem: { name: string } & CustomMenuItemActions): subitem is { name: string } & CustomMenuItemHrefAction {
//   return typeof (subitem as any).href === 'string';
// }

/** @see <https://components.react-dsfr.codegouv.studio/?path=/docs/components-header> */
export const Header = memo(
  forwardRef<
    HTMLDivElement,
    HeaderProps & {
      currentOrganization: UserInterfaceOrganizationSchemaType | null;
    }
  >((props, ref) => {
    const {
      className,
      id: id_props,
      brandTop,
      serviceTitle,
      serviceTagline,
      homeLinkProps,
      navigation = undefined,
      quickAccessItems = [],
      operatorLogo,
      renderSearchInput,
      clearSearchInputOnSearch = false,
      allowEmptySearch = false,
      onSearchButtonClick,
      classes = {},
      style,
      disableDisplay = false,
      currentOrganization = null,
      ...rest
    } = props;

    assert<Equals<keyof typeof rest, never>>();

    const id = id_props ?? 'fr-header';

    const menuModalId = `${headerMenuModalIdPrefix}-${id}`;
    const menuButtonId = `${id}-menu-button`;
    const searchModalId = `${id}-search-modal`;
    const searchInputId = `${id}-search-input`;

    const isSearchBarEnabled = renderSearchInput !== undefined || onSearchButtonClick !== undefined;

    setBrandTopAndHomeLinkProps({ brandTop, homeLinkProps });

    const pathname = usePathname();
    const { showLiveChat } = useLiveChat();

    const customMobileMenu: CustomMenuItem[] = [
      {
        content: 'À propos',
        icon: 'fr-icon-file-text-line',
        href: linkRegistry.get('about', undefined),
      },
      {
        content: 'Aide',
        icon: 'fr-icon-questionnaire-line',
        open: true,
        subitems: [
          {
            name: 'FAQ',
            href: linkRegistry.get('frequentlyAskedQuestions', undefined),
          },
          {
            name: 'Messagerie',
            onClick: showLiveChat,
          },
          {
            name: 'Contact',
            href: 'mailto:contact@assistant-declaration.beta.gouv.fr',
          },
        ],
      },
    ];

    if (currentOrganization) {
      customMobileMenu.push(
        {
          content: 'Mon compte',
          icon: 'fr-icon-account-circle-fill',
          open: true,
          subitems: [
            {
              name: 'Profil utilisateur',
              href: linkRegistry.get('accountSettings', undefined),
            },
          ],
        },
        {
          content: 'Se déconnecter',
          onClick: logout,
        }
      );
    } else {
      customMobileMenu.push({
        content: 'Accès outil',
        href: linkRegistry.get('dashboard', undefined),
      });
    }

    const { t } = useTranslation();
    const { t: tSearchBar } = useSearchBarTranslation();

    const { Link } = getLink();

    const getQuickAccessNode = (usecase: 'mobile' | 'desktop') => (
      <ul className={fr.cx('fr-btns-group')}>
        {quickAccessItems.map((quickAccessItem, i) => (
          <li key={i}>
            {(() => {
              const node = !typeGuard<HeaderProps.QuickAccessItem>(
                quickAccessItem,
                quickAccessItem instanceof Object && 'text' in quickAccessItem
              ) ? (
                quickAccessItem
              ) : (
                <HeaderQuickAccessItem quickAccessItem={quickAccessItem} />
              );

              if (node === null) {
                return null;
              }

              return cloneElement(node, {
                id: `${id}-quick-access-item-${i}${(() => {
                  switch (usecase) {
                    case 'mobile':
                      return '-mobile';
                    case 'desktop':
                      return '';
                  }
                  assert<Equals<typeof usecase, never>>();
                })()}`,
              });
            })()}
          </li>
        ))}
      </ul>
    );

    const hasOperatorLink = operatorLogo?.linkProps !== undefined;

    return (
      <>
        {!disableDisplay && <Display />}
        <header role="banner" id={id} className={cx(fr.cx('fr-header'), classes.root, className)} ref={ref} style={style} {...rest}>
          <div className={cx(fr.cx('fr-header__body' as any), classes.body)}>
            <div className={cx(fr.cx('fr-container'), classes.container)}>
              <div className={cx(fr.cx('fr-header__body-row'), classes.bodyRow)}>
                <div className={cx(fr.cx('fr-header__brand', !hasOperatorLink && 'fr-enlarge-link'), classes.brand)}>
                  <div className={cx(fr.cx('fr-header__brand-top'), classes.brandTop)}>
                    <div className={cx(fr.cx('fr-header__logo'), classes.logo)}>
                      {(() => {
                        const children = <p className={fr.cx('fr-logo')}>{brandTop}</p>;

                        return serviceTitle !== undefined ? children : <Link {...homeLinkProps}>{children}</Link>;
                      })()}
                    </div>
                    {operatorLogo !== undefined && (
                      <div className={cx(fr.cx('fr-header__operator', hasOperatorLink && 'fr-enlarge-link'), classes.operator)}>
                        {(() => {
                          const children = (
                            <img
                              className={cx(fr.cx('fr-responsive-img'), classes.operator)}
                              style={(() => {
                                switch (operatorLogo.orientation) {
                                  case 'vertical':
                                    return {
                                      width: '3.5rem',
                                    };
                                  case 'horizontal':
                                    return {
                                      maxWidth: '9.0625rem',
                                    };
                                }
                              })()}
                              src={operatorLogo.imgUrl}
                              alt={operatorLogo.alt}
                            />
                          );

                          return hasOperatorLink ? <Link {...operatorLogo.linkProps}>{children}</Link> : children;
                        })()}
                      </div>
                    )}

                    {(quickAccessItems.length > 0 || navigation !== undefined || isSearchBarEnabled) && (
                      <div className={cx(fr.cx('fr-header__navbar'), classes.navbar)}>
                        {isSearchBarEnabled && (
                          <button
                            id={`${id}-search-button`}
                            className={fr.cx('fr-btn--search', 'fr-btn')}
                            data-fr-opened={false}
                            aria-controls={searchModalId}
                            title={tSearchBar('label')}
                          >
                            {tSearchBar('label')}
                          </button>
                        )}
                        <button
                          className={fr.cx('fr-btn--menu', 'fr-btn')}
                          data-fr-opened="false"
                          aria-controls={menuModalId}
                          aria-haspopup="menu"
                          id={menuButtonId}
                          title={t('menu')}
                        >
                          {t('menu')}
                        </button>
                      </div>
                    )}
                  </div>
                  {serviceTitle !== undefined && (
                    <div className={cx(fr.cx('fr-header__service', hasOperatorLink && 'fr-enlarge-link'), classes.service)}>
                      <Link {...homeLinkProps}>
                        <p className={cx(fr.cx('fr-header__service-title'), classes.serviceTitle)}>{serviceTitle}</p>
                      </Link>
                      {serviceTagline !== undefined && (
                        <p className={cx(fr.cx('fr-header__service-tagline' as any), classes.serviceTagline)}>{serviceTagline}</p>
                      )}
                    </div>
                  )}
                </div>

                {(quickAccessItems.length > 0 || isSearchBarEnabled) && (
                  <div className={fr.cx('fr-header__tools')}>
                    {quickAccessItems.length > 0 && (
                      <div className={cx(fr.cx('fr-header__tools-links'), classes.toolsLinks)}>{getQuickAccessNode('desktop')}</div>
                    )}

                    {isSearchBarEnabled && (
                      <div className={fr.cx('fr-header__search', 'fr-modal')} id={searchModalId} aria-labelledby={`${id}-search-bar-button`}>
                        <div className={fr.cx('fr-container', 'fr-container-lg--fluid')}>
                          <button
                            id={`${id}-search-close-button`}
                            className={fr.cx('fr-btn--close', 'fr-btn')}
                            aria-controls={searchModalId}
                            title={t('close')}
                          >
                            {t('close')}
                          </button>
                          <div className={fr.cx('fr-search-bar')} role="search">
                            <label className={fr.cx('fr-label')} htmlFor={searchInputId}>
                              {tSearchBar('label')}
                            </label>
                            {(
                              renderSearchInput ??
                              (({ className, id, placeholder, type }) => (
                                <input className={className} id={id} placeholder={placeholder} type={type} />
                              ))
                            )({
                              className: fr.cx('fr-input'),
                              id: searchInputId,
                              placeholder: tSearchBar('label'),
                              type: 'search',
                            })}
                            <SearchButton
                              id={`${id}-search-bar-button`}
                              searchInputId={searchInputId}
                              onClick={onSearchButtonClick}
                              clearInputOnSearch={clearSearchInputOnSearch}
                              allowEmptySearch={allowEmptySearch}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {(navigation !== undefined || quickAccessItems.length !== 0) && (
            <div className={cx(fr.cx('fr-header__menu', 'fr-modal'), classes.menu)} id={menuModalId} aria-labelledby={menuButtonId}>
              <div className={fr.cx('fr-container')}>
                <button
                  id={`${id}-mobile-overlay-button-close`}
                  className={fr.cx('fr-btn--close', 'fr-btn')}
                  aria-controls={menuModalId}
                  title={t('close')}
                >
                  {t('close')}
                </button>
                {/* <div className={cx(fr.cx('fr-header__menu-links'), classes.menuLinks)}>{getQuickAccessNode('mobile')}</div> */}

                {/* CUSTOM MENU FOR MOBILE - START */}

                <nav className={fr.cx('fr-nav')} id="navigation" role="navigation" aria-label="Menu principal" data-fr-js-navigation="true">
                  <ul className={fr.cx('fr-nav__list')}>
                    {customMobileMenu.map((item) => (
                      <li className={fr.cx('fr-nav__item')} data-fr-js-navigation-item="true">
                        {hasSubitems(item) ? (
                          <>
                            <button
                              className={fr.cx('fr-nav__btn')}
                              aria-expanded="true"
                              aria-controls="menu-program"
                              data-fr-js-collapse-button="true"
                            >
                              {item.content}
                            </button>
                            <div
                              className={fr.cx('fr-collapse', 'fr-menu', 'fr-collapse--expanded')}
                              id="menu-program"
                              data-fr-js-collapse="true"
                              // style="--collapse: -164px; --collapse-max-height: none;"
                            >
                              <ul className={fr.cx('fr-menu__list')}>
                                {item.subitems.map((subitem) => {
                                  if ('href' in subitem) {
                                    return (
                                      <li>
                                        <a className={fr.cx('fr-nav__link')} href="/approche" target="_self">
                                          {subitem.name}
                                        </a>
                                      </li>
                                    );
                                  } else {
                                    return (
                                      <li>
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
                              <a className={fr.cx('fr-nav__link')} href={item.href}>
                                {item.content}
                              </a>
                            ) : (
                              <button className={fr.cx('fr-nav__link')} onClick={item.onClick}>
                                {item.content}
                              </button>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* <nav
                  id="navigation-866"
                  role="navigation"
                  aria-label="Menu principal"
                  className={fr.cx('fr-nav')}
                  data-fr-js-navigation="true"
                  data-fr-js-navigation-actionee="true"
                >
                  <ul className={fr.cx('fr-nav__list')}>
                    <li className={fr.cx('fr-nav__item')} data-fr-js-navigation-item="true">
                      <a
                        id="nav__link-prise-en-main-et-perimetre"
                        href={linkRegistry.get('about', undefined)}
                        target="_self"
                        aria-controls="modal-header__menu"
                        className={fr.cx('fr-nav__link')}
                        data-fr-js-modal-button="true"
                        data-fr-js-navigation-link-actionee="true"
                      >
                        À propos
                      </a>
                    </li>
                    <li className={fr.cx('fr-nav__item')} data-fr-js-navigation-item="true">
                      <a
                        id="nav__link-fondamentaux"
                        aria-current={hasPathnameThisMatch(pathname, organizationLink)}
                        href="/fondamentaux"
                        target="_self"
                        aria-controls="modal-header__menu"
                        className={fr.cx('fr-nav__link')}
                        data-fr-js-modal-button="true"
                        data-fr-js-navigation-link-actionee="true"
                      >
                        Fondamentaux
                      </a>
                    </li>
                  </ul>
                </nav> */}

                {/* CUSTOM MENU FOR MOBILE - END */}

                {navigation !== undefined &&
                  (navigation instanceof Array ? <MainNavigation id={`${id}-main-navigation`} items={navigation} /> : navigation)}
              </div>
            </div>
          )}
        </header>
      </>
    );
  })
);

Header.displayName = symToStr({ Header });

export default {
  Header: Header,
};
