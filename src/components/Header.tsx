//
// [IMPORTANT] We had to reuse a copy of the `react-dsfr` header to fit the adapated of for the mobile menu
// inside the `MainNavigation` component included by the header. Replacing imports would have been too much mess
//

/* eslint-disable no-inner-declarations */
import { fr } from '@codegouvfr/react-dsfr';
import { Display } from '@codegouvfr/react-dsfr/Display/Display';
import { HeaderProps, HeaderQuickAccessItem, useTranslation } from '@codegouvfr/react-dsfr/Header';
import { headerMenuModalIdPrefix } from '@codegouvfr/react-dsfr/Header/Header';
import { MainNavigation } from '@codegouvfr/react-dsfr/MainNavigation';
import { useTranslation as useSearchBarTranslation } from '@codegouvfr/react-dsfr/SearchBar/SearchBar';
import { SearchButton } from '@codegouvfr/react-dsfr/SearchBar/SearchButton';
import { getLink } from '@codegouvfr/react-dsfr/link';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import { setBrandTopAndHomeLinkProps } from '@codegouvfr/react-dsfr/zz_internal/brandTopAndHomeLinkProps';
import { ArrowForward, Logout } from '@mui/icons-material';
import { Button } from '@mui/material';
import { cloneElement, forwardRef, memo } from 'react';
import type { Equals } from 'tsafe';
import { assert } from 'tsafe/assert';
import { symToStr } from 'tsafe/symToStr';
import { typeGuard } from 'tsafe/typeGuard';

import { CustomDsfrNav } from '@ad/src/components/CustomDsfrNav';
import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';
import { UserInterfaceOrganizationSchemaType } from '@ad/src/models/entities/ui';
import { logout } from '@ad/src/utils/auth';
import { CustomMenuItem } from '@ad/src/utils/menu';
import { linkRegistry } from '@ad/src/utils/routes/registry';

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
        open: currentOrganization ? false : true, // If there is the other subitems we focus on those important ones since only 1 collapse block can be open at a time
        subitems: [
          {
            name: 'FAQ',
            href: linkRegistry.get('frequentlyAskedQuestions', undefined),
          },
          {
            name: 'Messagerie instantanée',
            onClick: showLiveChat,
          },
          {
            name: 'Contact courriel',
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
            {
              name: 'Spectacles',
              href: linkRegistry.get('organization', {
                organizationId: currentOrganization.id,
              }),
            },
            {
              name: 'Billetteries',
              href: linkRegistry.get('ticketingSystemList', {
                organizationId: currentOrganization.id,
              }),
            },
          ],
        },
        {
          content: (
            <Button component="span" size="medium" variant="outlined" startIcon={<Logout />} fullWidth sx={{ maxWidth: 300 }}>
              Se déconnecter
            </Button>
          ),
          onClick: logout,
        }
      );
    } else {
      customMobileMenu.push({
        content: (
          <Button component="span" size="medium" variant="contained" startIcon={<ArrowForward />} fullWidth sx={{ maxWidth: 300 }}>
            Accès outil
          </Button>
        ),
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

                        // @ts-ignore
                        return serviceTitle !== undefined ? children : <Link {...homeLinkProps}>{children}</Link>;
                      })()}
                    </div>
                    {operatorLogo !== undefined && (
                      <div className={cx(fr.cx('fr-header__operator', hasOperatorLink && 'fr-enlarge-link'), classes.operator)}>
                        {(() => {
                          const children = (
                            /* eslint-disable-next-line @next/next/no-img-element */
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

                          // @ts-ignore
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
                      {/* @ts-ignore */}
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
                <div className={cx(fr.cx('fr-header__menu-links'), classes.menuLinks)}>{/* {getQuickAccessNode('mobile')} */}</div>

                {navigation !== undefined &&
                  (navigation instanceof Array ? <MainNavigation id={`${id}-main-navigation`} items={navigation} /> : navigation)}

                {/* CUSTOM MENU FOR MOBILE - START */}
                <CustomDsfrNav menu={customMobileMenu} id="fr-header-custom-mobile-navigation" ariaLabel="Menu principal" hideOnDesktop={true} />
                {/* CUSTOM MENU FOR MOBILE - END */}
              </div>
            </div>
          )}
        </header>
      </>
    );
  })
);

Header.displayName = symToStr({ Header });
