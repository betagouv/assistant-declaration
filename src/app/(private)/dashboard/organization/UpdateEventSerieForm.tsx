'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { UpdateEventSeriePrefillSchemaType, UpdateEventSerieSchema, UpdateEventSerieSchemaType } from '@ad/src/models/actions/event';

export interface UpdateEventSerieFormProps {
  onSuccess: () => void;
  prefill?: UpdateEventSeriePrefillSchemaType;
}

export function UpdateEventSerieForm({ onSuccess, prefill }: UpdateEventSerieFormProps) {
  const updateEventSerie = trpc.updateEventSerie.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm({
    resolver: zodResolver(UpdateEventSerieSchema),
    defaultValues: {
      eventSerieId: '',
      name: '',
      events: [],
      ...prefill,
    },
  });

  const onSubmit = useCallback(
    async (input: UpdateEventSerieSchemaType) => {
      const result = await updateEventSerie.mutateAsync(input);

      onSuccess();
    },
    [updateEventSerie, onSuccess]
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
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={updateEventSerie.isPending}>
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
