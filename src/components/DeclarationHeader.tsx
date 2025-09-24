'use client';

import { Grading } from '@mui/icons-material';
import { Button, Grid, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DeclarationHeaderContext } from '@ad/src/components/DeclarationHeaderContext';
import { EventsSalesKeyFigures } from '@ad/src/components/EventsSalesKeyFigures';
import { DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { useLocalStorageViewedTicketingModal } from '@ad/src/proxies/ticketing';

export interface DeclarationHeaderProps {
  organizationId: string;
  eventSerie: EventSerieSchemaType;
  eventsWrappers: EventWrapperSchemaType[];
  transmittedDeclarations: DeclarationTypeSchemaType[];
  roundValuesForCopy?: boolean;
  readonly?: boolean;
}

export function DeclarationHeader({ eventSerie, eventsWrappers, transmittedDeclarations, roundValuesForCopy, readonly }: DeclarationHeaderProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { ContextualEventsSalesViewer } = useContext(DeclarationHeaderContext);

  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [ticketingModalViewed, setTicketingModalViewed] = useLocalStorageViewedTicketingModal(eventSerie.id);
  const [eventsSalesViewerOpen, setEventsSalesViewerOpen] = useState(!ticketingModalViewed);

  useEffect(() => {
    if (eventsSalesViewerOpen) {
      setTicketingModalViewed();
    }
  }, [eventsSalesViewerOpen, setTicketingModalViewed]);

  return (
    <>
      <Grid
        item
        xs={12}
        sx={{
          pt: { xs: 3, md: 3 },
          pb: { xs: 3, md: 2 },
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4} sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
            <Typography component="h1" variant="h4" data-sentry-mask>
              {eventSerie.name}
            </Typography>
            {mdUp && (
              <Typography component="p" variant="subtitle1" sx={{ fontWeight: 300 }}>
                {t('date.short', { date: eventSerie.startAt })} →{' '}
                {t('date.short', {
                  date: eventSerie.endAt,
                })}
              </Typography>
            )}
            <Typography component="p" variant="body1">
              <Button
                onClick={() => {
                  setEventsSalesViewerOpen(true);
                }}
                size="small"
                variant="contained"
                startIcon={<Grading />}
                sx={{
                  mt: 1,
                  '&::after': {
                    display: 'none !important',
                  },
                }}
              >
                {readonly ? `Voir la billetterie` : `Éditer la billetterie`}
              </Button>
              <ContextualEventsSalesViewer
                overview={{
                  wrappers: eventsWrappers,
                  eventSerie: eventSerie,
                  roundValuesForCopy: roundValuesForCopy,
                  readonly: readonly,
                }}
                open={eventsSalesViewerOpen}
                onClose={() => {
                  setEventsSalesViewerOpen(false);
                }}
                readonly={readonly}
              />
            </Typography>
          </Grid>
          <Grid item xs={12} lg={8}>
            <EventsSalesKeyFigures eventSerie={eventSerie} wrappers={eventsWrappers} roundValuesForCopy={roundValuesForCopy} minimal={true} />
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
