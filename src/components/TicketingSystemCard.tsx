'use client';

import { AdminPanelSettings, MoreVert, NotInterested } from '@mui/icons-material';
import {
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import Image from 'next/image';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import fallback from '@ad/public/assets/images/logo.png';
import billetweb from '@ad/src/assets/images/ticketing/billetweb.jpg';
import helloasso from '@ad/src/assets/images/ticketing/helloasso.jpg';
import mapado from '@ad/src/assets/images/ticketing/mapado.jpg';
import shotgun from '@ad/src/assets/images/ticketing/shotgun.jpg';
import soticket from '@ad/src/assets/images/ticketing/soticket.jpg';
import supersoniks from '@ad/src/assets/images/ticketing/supersoniks.jpg';
import { TicketingSystemCardContext } from '@ad/src/components/TicketingSystemCardContext';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { ticketingSystemSettings } from '@ad/src/core/ticketing/common';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';
import { menuPaperProps } from '@ad/src/utils/menu';

export interface TicketingSystemCardProps {
  ticketingSystem: TicketingSystemSchemaType;
  disconnectAction: () => Promise<void>;
  resetCredentialsAction: () => Promise<void>;
}

export function TicketingSystemCard(props: TicketingSystemCardProps) {
  const { t } = useTranslation('common');
  const { ContextualUpdateTicketingSystemForm } = useContext(TicketingSystemCardContext);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const handeOpenModal = () => {
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const resetCredentialsAction = useCallback(async () => {
    showConfirmationDialog({
      description: (
        <>
          Êtes-vous sûr de vouloir réinitialiser le jeton d&apos;accès pour l'identifiant{' '}
          <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
            {props.ticketingSystem.id}
          </Typography>{' '}
          ?
          <br />
          <br />
          <Typography component="span" sx={{ fontStyle: 'italic' }}>
            Cette étape invalidera le précédent jeton d'accès. Si vous l&apos;aviez entré dans votre outil de billetterie, il faudra le mettre à jour.
          </Typography>
        </>
      ),
      onConfirm: async () => {
        await props.resetCredentialsAction();
      },
    });
  }, [props, showConfirmationDialog, t]);

  const disconnectAction = useCallback(async () => {
    showConfirmationDialog({
      description: (
        <>
          Êtes-vous sûr de vouloir déconnecter et supprimer votre billetterie{' '}
          <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
            {t(`model.ticketingSystemName.enum.${props.ticketingSystem.name}`)}
          </Typography>{' '}
          de l&apos;organisation ?
        </>
      ),
      onConfirm: async () => {
        await props.disconnectAction();
      },
    });
  }, [props, showConfirmationDialog, t]);

  const logo = useMemo(() => {
    if (props.ticketingSystem.name === 'BILLETWEB') {
      return billetweb;
    } else if (props.ticketingSystem.name === 'HELLOASSO') {
      return helloasso;
    } else if (props.ticketingSystem.name === 'MAPADO') {
      return mapado;
    } else if (props.ticketingSystem.name === 'SHOTGUN') {
      return shotgun;
    } else if (props.ticketingSystem.name === 'SOTICKET') {
      return soticket;
    } else if (props.ticketingSystem.name === 'SUPERSONIKS') {
      return supersoniks;
    } else {
      return fallback;
    }
  }, [props.ticketingSystem.name]);

  const ticketingSettings = useMemo(() => ticketingSystemSettings[props.ticketingSystem.name], [props.ticketingSystem.name]);

  return (
    <Card variant="outlined" sx={{ position: 'relative' }}>
      <CardHeader
        action={
          <Tooltip title="Options de la billetterie">
            <IconButton
              onClick={handleClick}
              size="small"
              sx={{ ml: 2 }}
              aria-label="options"
              aria-controls={open ? 'ticketing-system-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <MoreVert />
            </IconButton>
          </Tooltip>
        }
        sx={{ position: 'absolute', right: 0 }}
      />
      <CardContent sx={{ p: '1rem !important' }}>
        <Grid container direction={'column'} spacing={2}>
          <Grid item xs={12}>
            <Grid container alignItems="center" spacing={2} sx={{ pr: '40px' }}>
              <Grid item sx={{ display: 'flex' }}>
                <Image src={logo} alt="" width={120} height={120} style={{ objectFit: 'contain' }} data-sentry-block />
              </Grid>
              <Grid item data-sentry-mask>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Typography component="b" variant="h4">
                      {t(`model.ticketingSystemName.enum.${props.ticketingSystem.name}`)}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
      <Menu
        anchorEl={anchorEl}
        id="ticketing-system-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{ ...menuPaperProps }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {ticketingSettings.strategy === 'PUSH' ? (
          <MenuItem onClick={resetCredentialsAction}>
            <ListItemIcon>
              <AdminPanelSettings fontSize="small" />
            </ListItemIcon>
            Réinitialiser les identifiants
          </MenuItem>
        ) : (
          <MenuItem onClick={handeOpenModal}>
            <ListItemIcon>
              <AdminPanelSettings fontSize="small" />
            </ListItemIcon>
            Mettre à jour les identifiants
          </MenuItem>
        )}
        <MenuItem onClick={disconnectAction}>
          <ListItemIcon>
            <NotInterested fontSize="small" />
          </ListItemIcon>
          Déconnecter
        </MenuItem>
      </Menu>
      <Dialog open={modalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>Modification des identifiants {t(`model.ticketingSystemName.enum.${props.ticketingSystem.name}`)}</DialogTitle>
        <DialogContent>
          <ContextualUpdateTicketingSystemForm ticketingSystem={props.ticketingSystem} onSuccess={handleCloseModal} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
