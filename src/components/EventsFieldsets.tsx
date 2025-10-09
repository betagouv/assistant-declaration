import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useMemo } from 'react';
import { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormTrigger, useFieldArray } from 'react-hook-form';

import { EventFieldset } from '@ad/src/components/EventFieldset';
import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationWrapperSchemaType } from '@ad/src/models/entities/declaration/common';
import { RowForForm } from '@ad/src/utils/validation';

export interface EventsFieldsetsProps {
  control: Control<FillDeclarationSchemaType, any>;
  register: UseFormRegister<FillDeclarationSchemaType>;
  setValue: UseFormSetValue<FillDeclarationSchemaType>;
  trigger: UseFormTrigger<FillDeclarationSchemaType>;
  placeholder: DeclarationWrapperSchemaType['placeholder'];
  errors: FieldErrors<FillDeclarationSchemaType>['events'];
  readonly?: boolean;
}

export function EventsFieldsets({ control, register, setValue, trigger, placeholder, errors, readonly }: EventsFieldsetsProps) {
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

  return (
    <div className={fr.cx('fr-grid-row')}>
      {errors?.message && (
        <div className={fr.cx('fr-col-12')}>
          <Alert severity="error" small={true} description={errors.message} />
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
                    trigger={trigger}
                    eventIndex={eventWithErrorLogic.index}
                    name={`events.${eventWithErrorLogic.index}`}
                    placeholder={placeholder}
                    errors={eventWithErrorLogic.errors}
                    readonly={false}
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
