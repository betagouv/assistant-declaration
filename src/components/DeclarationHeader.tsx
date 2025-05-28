'use client';

import { Tabs } from '@codegouvfr/react-dsfr/Tabs';
import { Grading } from '@mui/icons-material';
import { LoadingButton as Button } from '@mui/lab';
import { Grid, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EventsSalesKeyFigures } from '@ad/src/components/EventsSalesKeyFigures';
import { EventsSalesViewer } from '@ad/src/components/EventsSalesViewer';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { useLocalStorageViewedTicketingModal } from '@ad/src/proxies/ticketing';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export const DeclarationHeaderContext = createContext({
  ContextualEventsSalesViewer: EventsSalesViewer,
});

export interface DeclarationHeaderProps {
  organizationId: string;
  eventSerie: EventSerieSchemaType;
  eventsWrappers: EventWrapperSchemaType[];
  currentDeclaration: 'sacem' | 'sacd' | 'astp' | 'cnm';
  roundValuesForCopy?: boolean;
}

export function DeclarationHeader({ organizationId, eventSerie, eventsWrappers, currentDeclaration, roundValuesForCopy }: DeclarationHeaderProps) {
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
                Éditer la billetterie
              </Button>
              <ContextualEventsSalesViewer
                overview={{
                  wrappers: eventsWrappers,
                  eventSerie: eventSerie,
                  roundValuesForCopy: roundValuesForCopy,
                }}
                open={eventsSalesViewerOpen}
                onClose={() => {
                  setEventsSalesViewerOpen(false);
                }}
              />
            </Typography>
          </Grid>
          <Grid item xs={12} lg={8}>
            <EventsSalesKeyFigures eventSerie={eventSerie} wrappers={eventsWrappers} roundValuesForCopy={roundValuesForCopy} minimal={true} />
          </Grid>
        </Grid>
      </Grid>
      <Grid
        item
        xs={12}
        sx={{
          pb: 0,
          // Override styles from DSFR since we are using tabs header as links
          '.fr-tabs': {
            boxShadow: 'none',
          },
          '.fr-tabs__panel': {
            display: 'none',
          },
          '.fr-tabs::before': {
            display: 'none',
          },
          '.fr-tabs__list': {
            padding: '8px 0 0 0',
          },
        }}
      >
        <Tabs
          selectedTabId={currentDeclaration}
          tabs={[
            { tabId: 'sacem', label: 'SACEM' },
            { tabId: 'sacd', label: 'SACD' },
            { tabId: 'astp', label: 'ASTP' },
            { tabId: 'cnm', label: 'CNM' },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== currentDeclaration) {
              router.push(
                linkRegistry.get('declaration', {
                  organizationId: organizationId,
                  eventSerieId: eventSerie.id,
                  declarationType: tabId as string,
                })
              );
            }
          }}
        >
          <></>
        </Tabs>
      </Grid>
    </>
  );
}
