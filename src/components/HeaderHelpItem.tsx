'use client';

import { Box, Grid, Popover } from '@mui/material';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import { EventEmitter } from 'eventemitter3';
import { PropsWithChildren, useEffect, useState } from 'react';

import { CustomDsfrNav } from '@ad/src/components/CustomDsfrNav';
import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';
import { CustomMenuItem, menuPaperProps } from '@ad/src/utils/menu';
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

  const customHelpMenu: CustomMenuItem[] = [
    {
      content: 'FAQ',
      href: linkRegistry.get('frequentlyAskedQuestions', undefined),
    },
    {
      content: 'Messagerie',
      onClick: showLiveChat,
    },
    {
      content: 'Contact',
      href: 'mailto:contact@assistant-declaration.beta.gouv.fr',
    },
  ];

  return (
    <Box aria-label="options" aria-controls={open ? 'help-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : undefined}>
      <Grid container direction="row" alignItems="center" spacing={1}>
        <Grid item>Aide</Grid>
      </Grid>
      <FocusTrap open={open}>
        <Popover
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
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CustomDsfrNav menu={customHelpMenu} id="fr-header-custom-desktop-help-navigation" ariaLabel="Menu d'aide" />
          </Box>
        </Popover>
      </FocusTrap>
    </Box>
  );
}
