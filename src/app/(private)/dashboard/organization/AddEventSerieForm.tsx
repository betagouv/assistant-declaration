'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton } from '@mui/material';
import { addHours, format, isBefore, parse } from 'date-fns';
import { useCallback, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { AddEventSeriePrefillSchemaType, AddEventSerieSchema, AddEventSerieSchemaType } from '@ad/src/models/actions/event';
import { RowForForm } from '@ad/src/utils/validation';

const datetimePattern = "yyyy-MM-dd'T'HH:mm"; // This is the one compatible with date-fns for using the datetime HTML input
const datetimeMinimum = '2020-01-01T00:00';
const datetimeMaximum = '2050-01-01T00:00';

export interface AddEventSerieFormProps {
  onSuccess: () => void;
  prefill?: AddEventSeriePrefillSchemaType;
}

export function AddEventSerieForm({ onSuccess, prefill }: AddEventSerieFormProps) {
  const addEventSerie = trpc.addEventSerie.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    control,
  } = useForm({
    resolver: zodResolver(AddEventSerieSchema),
    defaultValues: {
      ticketingSystemId: '',
      organizationId: '',
      name: '',
      events: [
        { startAt: new Date(), endAt: null }, // Always provide one so the user understand what's expected
      ],
      ...prefill,
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'events',
  });

  const eventsWithErrorLogic = useMemo(() => {
    return fields.map((field, index): RowForForm<typeof field, NonNullable<(typeof errors)['events']>[0]> => {
      return {
        index: index,
        data: field,
        errors: Array.isArray(errors) ? errors[index] : undefined,
      };
    });
  }, [fields, errors]);

  const onSubmit = useCallback(
    async (input: AddEventSerieSchemaType) => {
      const result = await addEventSerie.mutateAsync(input);

      onSuccess();
    },
    [addEventSerie, onSuccess]
  );

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="ajouter un spectacle">
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Input
              label="Nom"
              state={!!errors.name ? 'error' : undefined}
              stateRelatedMessage={errors?.name?.message}
              nativeInputProps={{
                ...register('name'),
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            {errors?.events?.message && (
              <div className={fr.cx('fr-col-12', 'fr-mb-4v')}>
                <Alert severity="error" small={true} description={errors.events.message} />
              </div>
            )}
            {eventsWithErrorLogic.map((eventWithErrorLogic) => {
              return (
                <div key={eventWithErrorLogic.index} className={fr.cx('fr-col-12')}>
                  <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
                    <hr className={fr.cx('fr-py-0', 'fr-mt-6v', 'fr-mb-2v')} style={{ width: '100%', height: 2 }} />
                    <div className={fr.cx('fr-col-12', 'fr-text--bold')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Représentation n°{eventWithErrorLogic.index + 1}
                      {eventsWithErrorLogic.length > 1 && ( // Since a serie requires at least one event we prevent removing all (better for the UX)
                        <IconButton
                          onClick={() => {
                            remove(eventWithErrorLogic.index);
                          }}
                          aria-label="supprimer"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </div>
                    <div className={fr.cx('fr-col-12', 'fr-col-sm-6')}>
                      <Controller
                        control={control}
                        name={`events.${eventWithErrorLogic.index}.startAt`}
                        render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                          return (
                            <Input
                              label="Date de début"
                              state={!!error ? 'error' : undefined}
                              stateRelatedMessage={error?.message}
                              nativeInputProps={{
                                type: 'datetime-local',
                                min: datetimeMinimum,
                                max: datetimeMaximum,
                                value: format(value, datetimePattern),
                                onChange: (event) => {
                                  if (!event.target.value) {
                                    return null;
                                  }

                                  const correspondingDate = parse(event.target.value, datetimePattern, new Date()); // It has the local timezone information

                                  onChange(correspondingDate);
                                },
                                onBlur: (event) => {
                                  onBlur();

                                  // If the end date value has never been set or if it's before the start date
                                  // we by default adjust it to 1 hour after
                                  const currentValue = parse(event.target.value, datetimePattern, new Date()); // `useEffect` would not help since we want this action only during `onBlur`
                                  const endAt = getValues(`events.${eventWithErrorLogic.index}.endAt`);

                                  if (!endAt || isBefore(endAt, currentValue)) {
                                    setValue(`events.${eventWithErrorLogic.index}.endAt`, addHours(currentValue, 1), {
                                      shouldDirty: true,
                                    });
                                  }
                                },
                              }}
                            />
                          );
                        }}
                      />
                    </div>
                    <div className={fr.cx('fr-col-12', 'fr-col-sm-6')}>
                      <Controller
                        control={control}
                        name={`events.${eventWithErrorLogic.index}.endAt`}
                        render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                          return (
                            <Input
                              label="Date de fin"
                              state={!!error ? 'error' : undefined}
                              stateRelatedMessage={error?.message}
                              nativeInputProps={{
                                type: 'datetime-local',
                                min: datetimeMinimum,
                                max: datetimeMaximum,
                                value: value ? format(value, datetimePattern) : '',
                                onChange: (event) => {
                                  if (!event.target.value) {
                                    return null;
                                  }

                                  const correspondingDate = parse(event.target.value, datetimePattern, new Date()); // It has the local timezone information

                                  onChange(correspondingDate);
                                },
                                onBlur: onBlur,
                              }}
                            />
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className={fr.cx('fr-col-12', 'fr-py-6v')} style={{ display: 'flex' }}>
              <Button
                priority="secondary"
                onClick={(event) => {
                  event.preventDefault();

                  append({
                    startAt: new Date(),
                    endAt: null,
                  });
                }}
                style={{ marginLeft: 'auto' }}
              >
                Ajouter une autre représentation
              </Button>
            </div>
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={addEventSerie.isPending}>
                  <span className={fr.cx('fr-icon-save-3-fill')} style={{ marginRight: 5 }} aria-hidden="true"></span>
                  Enregistrer
                </Button>
              </li>
            </ul>
          </div>
        </fieldset>
      </div>
    </BaseForm>
  );
}
