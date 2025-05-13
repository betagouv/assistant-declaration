'use client';

import { Tabs } from '@codegouvfr/react-dsfr/Tabs';
import { Grading } from '@mui/icons-material';
import { LoadingButton as Button } from '@mui/lab';
import { Grid, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState } from 'react';

import { EventsSalesViewer } from '@ad/src/components/EventsSalesViewer';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { linkRegistry } from '@ad/src/utils/routes/registry';

import { EventsSalesKeyFigures } from './EventsSalesKeyFigures';

export const DeclarationHeaderContext = createContext({
  ContextualEventsSalesViewer: EventsSalesViewer,
});

export interface DeclarationHeaderProps {
  organizationId: string;
  eventSerie: EventSerieSchemaType;
  eventsWrappers: EventWrapperSchemaType[];
  currentDeclaration: 'sacem' | 'sacd' | 'astp' | 'cnm';
}

export function DeclarationHeader({ organizationId, eventSerie, eventsWrappers, currentDeclaration }: DeclarationHeaderProps) {
  const router = useRouter();
  const { ContextualEventsSalesViewer } = useContext(DeclarationHeaderContext);

  // TODO: open first time, then save into localStorage
  const [eventsSalesViewerOpen, setEventsSalesViewerOpen] = useState(false);

  return (
    <>
      <Grid
        item
        xs={12}
        sx={{
          pt: { xs: 3, md: 4 },
          pb: { xs: 3, md: 2 },
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4} sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
            <Typography component="h1" variant="h4" data-sentry-mask>
              {eventSerie.name}
            </Typography>
            <Typography component="p" variant="body1">
              <Button
                onClick={() => {
                  setEventsSalesViewerOpen(true);
                }}
                size="medium"
                variant="contained"
                startIcon={<Grading />}
                sx={{
                  mt: 1,
                  '&::after': {
                    display: 'none !important',
                  },
                }}
              >
                Ajuster la billetterie
              </Button>
              <ContextualEventsSalesViewer
                overview={{
                  wrappers: eventsWrappers,
                  eventSerie: eventSerie,
                }}
                open={eventsSalesViewerOpen}
                onClose={() => {
                  setEventsSalesViewerOpen(false);
                }}
              />
            </Typography>
          </Grid>
          <Grid item xs={12} lg={8}>
            <EventsSalesKeyFigures eventSerie={eventSerie} wrappers={eventsWrappers} minimal={true} />
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
