'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import { EventEmitter } from 'eventemitter3';
import NextLink from 'next/link';
import { PropsWithChildren, useEffect, useState } from 'react';

import { Avatar } from '@ad/src/components/Avatar';
import { UserInterfaceOrganizationSchemaType } from '@ad/src/models/entities/ui';
import { logout } from '@ad/src/utils/auth';
import { menuPaperProps } from '@ad/src/utils/menu';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface HeaderOrganizationSwitchItemProps {
  organizations: UserInterfaceOrganizationSchemaType[];
  currentOrganization?: UserInterfaceOrganizationSchemaType;
  eventEmitter: EventEmitter;
}

export function HeaderOrganizationSwitchItem(props: PropsWithChildren<HeaderOrganizationSwitchItemProps>) {
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

  return (
    <Box aria-label="options" aria-controls={open ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : undefined}>
      <Grid container direction="row" alignItems="center" spacing={1}>
        {!!props.currentOrganization ? (
          <>
            <Grid item data-sentry-mask>
              {props.currentOrganization.name}
            </Grid>
          </>
        ) : (
          <Grid item>Sélectionner une organisation</Grid>
        )}
      </Grid>
      <FocusTrap open={open}>
        <Menu
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
          {props.organizations.map((organization) => {
            return (
              <MenuItem
                key={organization.id}
                component={NextLink}
                href={linkRegistry.get('organization', {
                  organizationId: organization.id,
                })}
                selected={organization.id === props.currentOrganization?.id}
                data-sentry-mask
              >
                {organization.name}
              </MenuItem>
            );
          })}
        </Menu>
      </FocusTrap>
    </Box>
  );
}
