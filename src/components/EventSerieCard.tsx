import { fr } from '@codegouvfr/react-dsfr';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { Card, CardContent, Tooltip } from '@mui/material';
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
    <NextLink href={props.sacemDeclarationLink} className={fr.cx('fr-link')}>
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          p: 3,
        }}
      >
        <CardContent sx={{ p: '0 !important' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className={fr.cx('fr-h5')} style={{ color: fr.colors.decisions.text.actionHigh.blueFrance.default }} data-sentry-mask>
                {props.wrapper.serie.name}
              </div>
              <Tooltip
                title={`Du ${t('date.longWithTime', { date: props.wrapper.serie.startAt })} au ${t('date.longWithTime', {
                  date: props.wrapper.serie.endAt,
                })}`}
                data-sentry-mask
              >
                <Tag
                  as="span"
                  style={{
                    backgroundColor: 'var(--background-contrast-brown-opera)',
                  }}
                  data-sentry-mask
                >
                  {onTheSameDay
                    ? t('date.shortWithTime', { date: props.wrapper.serie.startAt })
                    : `${t('date.short', { date: props.wrapper.serie.startAt })}  →  ${t('date.short', {
                        date: props.wrapper.serie.endAt,
                      })}`}
                </Tag>
              </Tooltip>
            </div>
            <span
              className={fr.cx('fr-icon--md', 'fr-icon-arrow-right-line')}
              style={{
                color: fr.colors.decisions.text.actionHigh.blueFrance.default,
                marginLeft: 'auto',
              }}
            />
          </div>
        </CardContent>
      </Card>
    </NextLink>
  );
}
