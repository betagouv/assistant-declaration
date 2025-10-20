import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useMemo } from 'react';
import { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormTrigger, UseFormWatch, useFieldArray } from 'react-hook-form';
import { z } from 'zod';

import { EventFieldset } from '@ad/src/components/EventFieldset';
import { FillDeclarationSchema } from '@ad/src/models/actions/declaration';
import { DeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/common';
import { RowForForm } from '@ad/src/utils/validation';

type FillDeclarationSchemaInputType = z.input<typeof FillDeclarationSchema>;

export interface EventsFieldsetsProps {
  control: Control<FillDeclarationSchemaInputType, any>;
  register: UseFormRegister<FillDeclarationSchemaInputType>;
  setValue: UseFormSetValue<FillDeclarationSchemaInputType>;
  watch: UseFormWatch<FillDeclarationSchemaInputType>;
  trigger: UseFormTrigger<FillDeclarationSchemaInputType>;
  placeholder: DeclarationWrapperSchemaType['placeholder'];
  errors: FieldErrors<FillDeclarationSchemaInputType>['events'];
  readonly?: boolean;
}

export function EventsFieldsets({ control, register, setValue, watch, trigger, placeholder, errors, readonly }: EventsFieldsetsProps) {
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'events',
  });

  const eventsWithErrorLogic = useMemo(() => {
    return fields.map((field, index): RowForForm<typeof field, NonNullable<typeof errors>[0]> => {
      return {
        index: index,
        data: field,
        errors: Array.isArray(errors) ? errors[index] : undefined,
      };
    });
  }, [fields, errors]);

  const errorMessage = useMemo(() => errors?.root?.message ?? errors?.message, [errors]);

  return (
    <div className={fr.cx('fr-grid-row')}>
      {errorMessage && (
        <div className={fr.cx('fr-col-12', 'fr-mb-4v')}>
          <Alert severity="error" small={true} description={errorMessage} />
        </div>
      )}
      {eventsWithErrorLogic.length > 0 ? (
        <>
          {eventsWithErrorLogic.map((eventWithErrorLogic) => {
            return (
              <div key={eventWithErrorLogic.index} className={fr.cx('fr-col-12')}>
                {eventWithErrorLogic.index > 0 && <hr className={fr.cx('fr-my-3v')} />}
                <div className={fr.cx('fr-col-12')}>
                  <EventFieldset
                    control={control}
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    trigger={trigger}
                    eventIndex={eventWithErrorLogic.index}
                    name={`events.${eventWithErrorLogic.index}`}
                    placeholder={placeholder}
                    errors={eventWithErrorLogic.errors}
                    readonly={readonly}
                  />
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className={fr.cx('fr-col-12')}>
          <p>Aucune date n&apos;a pu être récupérée pour ce spectacle. Il n&apos;y a donc aucune déclaration à faire à la SACEM.</p>
        </div>
      )}
    </div>
  );
}
