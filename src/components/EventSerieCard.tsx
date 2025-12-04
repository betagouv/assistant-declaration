import { fr } from '@codegouvfr/react-dsfr';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Card, CardContent, Dialog, DialogContent, DialogTitle, Tooltip } from '@mui/material';
import { IconButton } from '@mui/material';
import { isSameDay } from 'date-fns';
import NextLink from 'next/link';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EventSerieCardContext } from '@ad/src/components/EventSerieCardContext';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { EventSerieWrapperSchemaType } from '@ad/src/models/entities/event';

export interface EventSerieCardProps {
  wrapper: EventSerieWrapperSchemaType;
  declarationLink: string;
  onUpdate?: (eventSerie: string) => Promise<void>;
  onRemove?: (eventSerie: string) => Promise<void>;
}

export function EventSerieCard(props: EventSerieCardProps) {
  const { t } = useTranslation('common');
  const { ContextualUpdateEventSerieForm } = useContext(EventSerieCardContext);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const onTheSameDay = useMemo(() => {
    return isSameDay(props.wrapper.computedStartAt, props.wrapper.computedEndAt);
  }, [props.wrapper.computedStartAt, props.wrapper.computedEndAt]);

  const [eventSerieUpdateModalOpen, setEventSerieUpdateModalOpen] = useState<boolean>(false);
  const openEventSerieUpdateModal = useCallback(() => {
    setEventSerieUpdateModalOpen(true);
  }, [setEventSerieUpdateModalOpen]);
  const closeEventSerieUpdateModal = useCallback(() => {
    setEventSerieUpdateModalOpen(false);
  }, [setEventSerieUpdateModalOpen]);

  const noLongerEditable = useMemo(() => {
    // If currently a declaration process has started it's no longer editable
    return props.wrapper.partialDeclarations.length > 0;
  }, [props.wrapper]);

  return (
    <>
      <NextLink href={props.declarationLink} className={fr.cx('fr-link')}>
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
                  title={`Du ${t('date.longWithTime', { date: props.wrapper.computedStartAt })} au ${t('date.longWithTime', {
                    date: props.wrapper.computedEndAt,
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
                      ? t('date.shortWithTime', { date: props.wrapper.computedStartAt })
                      : `${t('date.short', { date: props.wrapper.computedStartAt })}  →  ${t('date.short', {
                          date: props.wrapper.computedEndAt,
                        })}`}
                  </Tag>
                </Tooltip>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {props.onUpdate && (
                    <>
                      <Tooltip title={noLongerEditable ? `Ce spectacle n'est plus modifiable` : ''}>
                        <span>
                          <IconButton
                            disabled={noLongerEditable}
                            onClick={(event) => {
                              event.preventDefault();

                              openEventSerieUpdateModal();
                            }}
                            size="small"
                            aria-label="supprimer"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                  {props.onRemove && (
                    <Tooltip title={noLongerEditable ? `Ce spectacle n'est plus supprimable` : ''}>
                      <span>
                        <IconButton
                          disabled={noLongerEditable}
                          onClick={(event) => {
                            event.preventDefault();

                            showConfirmationDialog({
                              description: (
                                <>
                                  Êtes-vous sûr de vouloir supprimer le spectacle{' '}
                                  <span className={fr.cx('fr-text--bold')} data-sentry-mask>
                                    {props.wrapper.serie.name}
                                  </span>{' '}
                                  ?
                                </>
                              ),
                              onConfirm: async () => {
                                props.onRemove && (await props.onRemove(props.wrapper.serie.id));
                              },
                            });
                          }}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </div>
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
      {/* The modal must be outside the link otherwise any button of this generic form component would trigger `NextLink` */}
      <Dialog open={eventSerieUpdateModalOpen} onClose={closeEventSerieUpdateModal}>
        <DialogTitle>Édition d&apos;un spectacle</DialogTitle>
        <DialogContent>
          <ContextualUpdateEventSerieForm
            prefill={{ eventSerieId: props.wrapper.serie.id, name: props.wrapper.serie.name, events: props.wrapper.partialEvents }}
            onSuccess={closeEventSerieUpdateModal}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
