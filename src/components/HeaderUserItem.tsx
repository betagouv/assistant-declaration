'use client';

import { Logout } from '@mui/icons-material';
import { Box, Button, Grid, Popover } from '@mui/material';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import { EventEmitter } from 'eventemitter3';
import { PropsWithChildren, useEffect, useState } from 'react';

import { CustomDsfrNav } from '@ad/src/components/CustomDsfrNav';
import { UserInterfaceOrganizationSchemaType } from '@ad/src/models/entities/ui';
import { TokenUserSchemaType } from '@ad/src/models/entities/user';
import { logout } from '@ad/src/utils/auth';
import { CustomMenuItem, menuPaperProps } from '@ad/src/utils/menu';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface HeaderUserItemProps {
  user: TokenUserSchemaType;
  eventEmitter: EventEmitter;
  currentOrganization: UserInterfaceOrganizationSchemaType | null;
}

export function HeaderUserItem(props: PropsWithChildren<HeaderUserItemProps>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    props.eventEmitter.on('click', (event) => {
      if (open) {
        handleClose();
      } else {
        handleClick(event);
      }
    });

    return function cleanup() {
      props.eventEmitter.removeAllListeners();
    };
  }, [props.eventEmitter, open]);

  const customUserMenu: CustomMenuItem[] = [
    {
      content: 'Profil utilisateur',
      href: linkRegistry.get('accountSettings', undefined),
    },
    ...(props.currentOrganization
      ? [
          {
            content: 'Spectacles',
            href: linkRegistry.get('organization', {
              organizationId: props.currentOrganization.id,
            }),
          },
          {
            content: 'Billetteries',
            href: linkRegistry.get('ticketingSystemList', {
              organizationId: props.currentOrganization.id,
            }),
          },
        ]
      : []),
    {
      content: (
        <Button component="span" size="medium" variant="outlined" startIcon={<Logout />} fullWidth sx={{ maxWidth: 300 }}>
          Se déconnecter
        </Button>
      ),
      onClick: logout,
    },
  ];

  return (
    <Box aria-label="options" aria-controls={open ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : undefined}>
      <Grid container direction="row" alignItems="center" spacing={1}>
        <Grid item>Mon compte</Grid>
      </Grid>
      <FocusTrap open={open}>
        <Popover
          role="menu"
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          disableEnforceFocus={true} // Required otherwise on responsive navbar clicking when the menu is open throws an error ("Maximum call stack size exceeded" on the "FocusTrap"). I did not find a way to fix this :/ ... not sure about the accessibility impact so we added manually a `<FocusTrap>` (https://mui.com/material-ui/react-modal/#focus-trap)?
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{ ...menuPaperProps }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          sx={{ zIndex: 2000 }} // Needed to be displayed over the navbar on mobile devices
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              // '& .fr-nav__link': {
              //   width: '100% !important',
              // },
            }}
          >
            <CustomDsfrNav menu={customUserMenu} id="fr-header-custom-desktop-user-navigation" ariaLabel="Menu du compte" />
          </Box>
        </Popover>
      </FocusTrap>
    </Box>
  );
}
