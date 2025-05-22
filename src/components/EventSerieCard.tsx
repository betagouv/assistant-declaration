import { fr } from '@codegouvfr/react-dsfr';
import { ArrowForward } from '@mui/icons-material';
import { Box, CardContent, Chip, Link, Tooltip, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import { isSameDay } from 'date-fns';
import NextLink from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EventSerieWrapperSchemaType } from '@ad/src/models/entities/event';

export interface EventSerieCardProps {
  wrapper: EventSerieWrapperSchemaType;
  sacemDeclarationLink: string;
  sacdDeclarationLink: string;
  astpDeclarationLink: string;
  cnmDeclarationLink: string;
}

export function EventSerieCard(props: EventSerieCardProps) {
  const { t } = useTranslation('common');

  const onTheSameDay = useMemo(() => {
    return isSameDay(props.wrapper.serie.startAt, props.wrapper.serie.endAt);
  }, [props.wrapper.serie.startAt, props.wrapper.serie.endAt]);

  return (
    <Link component={NextLink} href={props.sacemDeclarationLink} underline="none">
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          p: 3,
        }}
      >
        <CardContent sx={{ p: '0 !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography component="div" variant="h5" color="primary" data-sentry-mask>
                {props.wrapper.serie.name}
              </Typography>
              <Tooltip
                title={`Du ${t('date.longWithTime', { date: props.wrapper.serie.startAt })} au ${t('date.longWithTime', {
                  date: props.wrapper.serie.endAt,
                })}`}
                data-sentry-mask
              >
                <Chip
                  label={
                    onTheSameDay
                      ? t('date.shortWithTime', { date: props.wrapper.serie.startAt })
                      : `${t('date.short', { date: props.wrapper.serie.startAt })}  →  ${t('date.short', {
                          date: props.wrapper.serie.endAt,
                        })}`
                  }
                  sx={{
                    bgcolor: 'var(--background-contrast-brown-opera)',
                    height: 'auto',
                    p: '5px',
                    '& > .MuiChip-label': {
                      whiteSpace: 'pre-wrap !important',
                      wordBreak: 'break-word !important', // Needed in case of word/sentence bigger than parent width
                    },
                  }}
                  data-sentry-mask
                />
              </Tooltip>
            </Box>
            <ArrowForward sx={{ color: fr.colors.decisions.text.actionHigh.blueFrance.default, ml: 'auto' }} />
          </Box>
        </CardContent>
      </Card>
    </Link>
  );
}
