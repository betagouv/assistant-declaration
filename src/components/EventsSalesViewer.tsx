import { fr } from '@codegouvfr/react-dsfr';
import { Close } from '@mui/icons-material';
import { AppBar, Drawer, Grid, IconButton, Toolbar, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import { createContext, useContext } from 'react';

import { EventsSalesOverview, EventsSalesOverviewProps } from '@ad/src/components/EventsSalesOverview';

export enum Section {
  ToDo = 'todo',
  InProgress = 'in-progress',
  Done = 'done',
}

export const sectionFlow: Section[] = Object.values(Section);

export const EventsSalesViewerContext = createContext({
  ContextualEventsSalesOverview: EventsSalesOverview,
});

export interface EventsSalesViewerProps {
  overview: EventsSalesOverviewProps;
  open: boolean;
  onClose?: () => void;
  readonly?: boolean;
}

export function EventsSalesViewer({ overview, open, onClose, readonly }: EventsSalesViewerProps) {
  const muiTheme = useTheme();
  const mobileFormat = useMediaQuery(muiTheme.breakpoints.down('md'));

  const { ContextualEventsSalesOverview } = useContext(EventsSalesViewerContext);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      transitionDuration={mobileFormat ? 0 : undefined} // To simulate opening a dialog on mobile
      PaperProps={{
        sx: {
          width: mobileFormat ? '100%' : '90%',
          maxWidth: mobileFormat ? undefined : '1000px',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better performance on mobile
      }}
    >
      <AppBar
        position="static"
        sx={{
          backdropFilter: 'blur(6px)',
          backgroundColor: (theme) => alpha(theme.palette.background.default, 0.8),
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Détails de la billetterie
          </Typography>
          <IconButton onClick={onClose} size="small" edge="start" aria-label="fermer la visualisation">
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Grid
        container
        spacing={2}
        sx={{
          bgcolor: fr.colors.decisions.background.alt.blueFrance.default,
          flexGrow: 1, // For the background to go to the bottom
          px: 4,
          py: 2,
        }}
      >
        <Grid item xs={12}>
          <ContextualEventsSalesOverview wrappers={overview.wrappers} eventSerie={overview.eventSerie} readonly={readonly} />
        </Grid>
      </Grid>
    </Drawer>
  );
}
