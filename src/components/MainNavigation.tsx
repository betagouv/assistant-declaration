import { MainNavigationProps } from '@codegouvfr/react-dsfr/MainNavigation';
import { MegaMenu } from '@codegouvfr/react-dsfr/MainNavigation/MegaMenu';
import { Menu } from '@codegouvfr/react-dsfr/MainNavigation/Menu';
import { fr } from '@codegouvfr/react-dsfr/fr';
import { createComponentI18nApi } from '@codegouvfr/react-dsfr/i18n';
import { getLink } from '@codegouvfr/react-dsfr/link';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import { useAnalyticsId } from '@codegouvfr/react-dsfr/tools/useAnalyticsId';
import { forwardRef, memo } from 'react';
import type { Equals } from 'tsafe';
import { assert } from 'tsafe/assert';
import { symToStr } from 'tsafe/symToStr';

export const MainNavigation = memo(
  forwardRef<HTMLDivElement, MainNavigationProps>((props, ref) => {
    const { className, items, classes = {}, style, id: id_props, ...rest } = props;

    assert<Equals<keyof typeof rest, never>>();

    const { t } = useTranslation();

    const { Link } = getLink();

    const id = useAnalyticsId({
      explicitlyProvidedId: id_props,
      defaultIdPrefix: 'main-navigation',
    });

    const getMenuId = (i: number) => `${id}-menu-${i}`;

    return (
      <nav
        id={id}
        className={cx(fr.cx('fr-nav'), classes.root, className)}
        style={style}
        role="navigation"
        aria-label={t('main menu')}
        ref={ref}
        {...rest}
      >
        <ul className={cx(fr.cx('fr-nav__list'), classes.list)}>
          {items.map(({ className, text, isActive = false, linkProps, menuLinks = [], megaMenu, buttonProps = {} }, i) => (
            <li key={i} className={cx(fr.cx('fr-nav__item'), classes.item, className)}>
              COUCOUUUUUUU
              {linkProps !== undefined ? (
                // @ts-ignore
                <Link
                  {...linkProps}
                  id={linkProps.id ?? `${id}-link-${i}`}
                  className={cx(fr.cx('fr-nav__link'), classes.link, linkProps.className)}
                  {...(isActive && { ['aria-current']: 'page' })}
                >
                  {text}
                  Coucou 222
                </Link>
              ) : (
                <>
                  <button
                    {...buttonProps}
                    id={buttonProps.id ?? `${id}-button-${i}`}
                    className={cx(fr.cx('fr-nav__btn'), buttonProps.className, classes.btn)}
                    aria-expanded={false}
                    aria-controls={getMenuId(i)}
                    {...(isActive && { ['aria-current']: true })}
                  >
                    {text}
                  </button>
                  {menuLinks.length !== 0 && (
                    <Menu
                      classes={{
                        root: cx(fr.cx('fr-collapse'), classes.root),
                        list: classes.menuList,
                      }}
                      links={menuLinks}
                      id={getMenuId(i)}
                    />
                  )}
                  {megaMenu !== undefined && (
                    <MegaMenu
                      classes={{
                        root: cx(fr.cx('fr-collapse'), classes.megaMenu),
                        leader: classes.megaMenuLeader,
                        category: classes.megaMenuCategory,
                        list: classes.menuList,
                      }}
                      id={getMenuId(i)}
                      leader={megaMenu.leader}
                      categories={megaMenu.categories}
                    />
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
    );
  })
);

MainNavigation.displayName = symToStr({ MainNavigation });

const { useTranslation, addMainNavigationTranslations } = createComponentI18nApi({
  componentName: symToStr({ MainNavigation }),
  frMessages: {
    /* spell-checker: disable */
    'main menu': 'Menu principal',
    /* spell-checker: enable */
  },
});
