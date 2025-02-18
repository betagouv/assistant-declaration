import { Box, Button, CardActions, CardContent, Chip, Tooltip, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import NextLink from 'next/link';
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

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        p: 1,
      }}
    >
      <CardContent>
        <Typography component="div" variant="h5" data-sentry-mask>
          {props.wrapper.serie.name}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Tooltip
            title={`Du ${t('date.longWithTime', { date: props.wrapper.serie.startAt })} au ${t('date.longWithTime', {
              date: props.wrapper.serie.endAt,
            })}`}
            data-sentry-mask
          >
            <Chip
              label={`${t('date.long', { date: props.wrapper.serie.startAt })}  →  ${t('date.long', {
                date: props.wrapper.serie.endAt,
              })}`}
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
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Typography component="div" variant="subtitle2" sx={{ display: { xs: 'none', sm: 'block' } }}>
          Déclarations :
        </Typography>
        <Button component={NextLink} href={props.sacemDeclarationLink} size="small">
          SACEM
        </Button>
        <Button component={NextLink} href={props.sacdDeclarationLink} size="small">
          SACD
        </Button>
        <Button component={NextLink} href={props.astpDeclarationLink} size="small">
          ASTP
        </Button>
        <Button component={NextLink} href={props.cnmDeclarationLink} size="small">
          CNM
        </Button>
      </CardActions>
    </Card>
  );
}
