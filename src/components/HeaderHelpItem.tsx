'use client';

import { ContactMail, FormatListBulleted } from '@mui/icons-material';
import { Box, Grid, ListItemIcon, Menu, MenuItem } from '@mui/material';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import { EventEmitter } from 'eventemitter3';
import NextLink from 'next/link';
import { PropsWithChildren, useEffect, useState } from 'react';

import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';
import { menuPaperProps } from '@ad/src/utils/menu';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface HeaderHelpItemProps {
  eventEmitter: EventEmitter;
}

export function HeaderHelpItem(props: PropsWithChildren<HeaderHelpItemProps>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const { showLiveChat } = useLiveChat();

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
    <Box aria-label="options" aria-controls={open ? 'help-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : undefined}>
      <Grid container direction="row" alignItems="center" spacing={1}>
        <Grid item>Aide</Grid>
      </Grid>
      <FocusTrap open={open}>
        <Menu
          anchorEl={anchorEl}
          id="help-menu"
          open={open}
          disableEnforceFocus={true} // Required otherwise on responsive navbar clicking when the menu is open throws an error ("Maximum call stack size exceeded" on the "FocusTrap"). I did not find a way to fix this :/ ... not sure about the accessibility impact so we added manually a `<FocusTrap>` (https://mui.com/material-ui/react-modal/#focus-trap)?
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{ ...menuPaperProps }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          sx={{ zIndex: 2000 }} // Needed to be displayed over the navbar on mobile devices
        >
          <MenuItem onClick={showLiveChat}>
            <ListItemIcon>
              <ContactMail fontSize="small" />
            </ListItemIcon>
            Messagerie
          </MenuItem>
          <MenuItem component={NextLink} href={linkRegistry.get('frequentlyAskedQuestions', undefined)}>
            <ListItemIcon>
              <FormatListBulleted fontSize="small" />
            </ListItemIcon>
            Questions fréquentes
          </MenuItem>
        </Menu>
      </FocusTrap>
    </Box>
  );
}
