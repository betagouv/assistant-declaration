'use client';

import { Tabs } from '@codegouvfr/react-dsfr/Tabs';
import { Grid, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

import { EventSerieSchemaType } from '@ad/src/models/entities/event';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface DeclarationHeaderProps {
  organizationId: string;
  eventSerie: EventSerieSchemaType;
  currentDeclaration: 'sacem' | 'sacd' | 'astp' | 'cnm';
}

export function DeclarationHeader({ organizationId, eventSerie, currentDeclaration }: DeclarationHeaderProps) {
  const router = useRouter();

  return (
    <>
      <Grid
        item
        xs={12}
        sx={{
          pt: { xs: 3, md: 5 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <Typography component="h1" variant="h4" data-sentry-mask>
          {eventSerie.name}
        </Typography>
        <Typography component="p" variant="body1">
          Vérifiez et corrigez les données avant de déclarer
        </Typography>
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
