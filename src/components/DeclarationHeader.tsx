'use client';

import { Tabs } from '@codegouvfr/react-dsfr/Tabs';
import { CheckCircle, Grading } from '@mui/icons-material';
import { Button, Grid, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DeclarationHeaderContext } from '@ad/src/components/DeclarationHeaderContext';
import { EventsSalesKeyFigures } from '@ad/src/components/EventsSalesKeyFigures';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { EventSerieSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { useLocalStorageViewedTicketingModal } from '@ad/src/proxies/ticketing';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface DeclarationHeaderProps {
  organizationId: string;
  eventSerie: EventSerieSchemaType;
  eventsWrappers: EventWrapperSchemaType[];
  currentDeclaration: 'sacem' | 'sacd' | 'astp' | 'cnm';
  transmittedDeclarations: DeclarationTypeSchemaType[];
  roundValuesForCopy?: boolean;
  readonly?: boolean;
}

export function DeclarationHeader({
  organizationId,
  eventSerie,
  eventsWrappers,
  currentDeclaration,
  transmittedDeclarations,
  roundValuesForCopy,
  readonly,
}: DeclarationHeaderProps) {
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
            {
              tabId: 'sacem',
              label: <>{transmittedDeclarations.includes(DeclarationTypeSchema.Values.SACEM) && <CheckCircle sx={{ mr: 1 }} />}SACEM</>,
            },
            {
              tabId: 'sacd',
              label: <>{transmittedDeclarations.includes(DeclarationTypeSchema.Values.SACD) && <CheckCircle sx={{ mr: 1 }} />}SACD</>,
            },
            {
              tabId: 'astp',
              label: <>{transmittedDeclarations.includes(DeclarationTypeSchema.Values.ASTP) && <CheckCircle sx={{ mr: 1 }} />}ASTP</>,
            },
            { tabId: 'cnm', label: <>{transmittedDeclarations.includes(DeclarationTypeSchema.Values.CNM) && <CheckCircle sx={{ mr: 1 }} />}CNM</> },
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
