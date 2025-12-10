'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { AddEventSeriePrefillSchemaType, AddEventSerieSchema, AddEventSerieSchemaType } from '@ad/src/models/actions/event';
import { RowForForm } from '@ad/src/utils/validation';

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
    setValue,
    control,
  } = useForm({
    resolver: zodResolver(AddEventSerieSchema),
    defaultValues: {
      ticketingSystemId: '',
      name: '',
      events: [],
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
            {errors?.events?.root?.message && (
              <div className={fr.cx('fr-col-12', 'fr-mb-4v')}>
                <Alert severity="error" small={true} description={errors.events.root.message} />
              </div>
            )}
            {eventsWithErrorLogic.map((eventWithErrorLogic) => {
              return (
                <div key={eventWithErrorLogic.index} className={fr.cx('fr-col-12')}>
                  <div className={fr.cx('fr-col-12')}>
                    <Input
                      label="Date de début"
                      state={!!eventWithErrorLogic.errors?.startAt ? 'error' : undefined}
                      stateRelatedMessage={eventWithErrorLogic.errors?.startAt?.message}
                      nativeInputProps={{
                        ...register(`events.${eventWithErrorLogic.index}.startAt`),
                      }}
                    />
                    <Input
                      label="Date de fin"
                      state={!!eventWithErrorLogic.errors?.endAt ? 'error' : undefined}
                      stateRelatedMessage={eventWithErrorLogic.errors?.endAt?.message}
                      nativeInputProps={{
                        ...register(`events.${eventWithErrorLogic.index}.endAt`),
                      }}
                    />
                    <Button
                      onClick={() => {
                        remove(eventWithErrorLogic.index);
                      }}
                    >
                      Ajouter une représentation
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              onClick={() => {
                append({
                  startAt: new Date(),
                  endAt: null,
                });
              }}
            >
              Ajouter une représentation
            </Button>
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={addEventSerie.isPending}>
                  <span className={fr.cx('fr-icon-save-3-fill')} style={{ marginRight: 5 }} aria-hidden="true"></span>
                  Ajouter
                </Button>
              </li>
            </ul>
          </div>
        </fieldset>
      </div>
    </BaseForm>
  );
}
