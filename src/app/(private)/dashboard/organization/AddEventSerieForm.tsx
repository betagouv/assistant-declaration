'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { AddEventSeriePrefillSchemaType, AddEventSerieSchema, AddEventSerieSchemaType } from '@ad/src/models/actions/event';

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
