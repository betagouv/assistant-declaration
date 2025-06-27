import { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';

export type CustomMenuItemHrefAction = {
  href: string;
};

export type CustomMenuItemOnClickAction = {
  onClick: () => void;
};
export type CustomMenuItemActions = CustomMenuItemOnClickAction | CustomMenuItemHrefAction;

export type CustomMenuItem = {
  content: string | React.JSX.Element;
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

export const menuPaperProps = {
  elevation: 0,
  sx: {
    minWidth: 250,
    overflow: 'visible',
    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
    mt: 1.5,
    '&:before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: 0,
      right: 14,
      width: 10,
      height: 10,
      bgcolor: 'background.paper',
      transform: 'translateY(-50%) rotate(45deg)',
      zIndex: 0,
    },
    //
    // [WORKAROUND]
    // The workaround is needed since our design chose to mimic the mobile menu on desktop
    // so we have to cancel all media query rules set for desktop
    //
    '& .fr-nav__item': {
      marginLeft: '0 !important',
      position: 'relative !important',
      alignItems: 'stretch !important',
    },
    '& .fr-nav__item::before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      boxShadow: '0 -1px 0 0 var(--border-default-grey), inset 0 -1px 0 0 var(--border-default-grey)',
    },
    '& .fr-nav__item:first-of-type::before': {
      boxShadow: 'inset 0 -1px 0 0 var(--border-default-grey)',
    },
    '& .fr-nav__link, & .fr-nav__button': {
      padding: '0.75rem 1rem !important',
      margin: 'unset !important',
      width: '100% !important',
      height: 'unset !important',
      minHeight: 'unset !important',
      // fontWeight: '700 !important',
      fontWeight: '500 !important', // 700 was too much for the desktop while seeing other content from the page
    },
  },
};
