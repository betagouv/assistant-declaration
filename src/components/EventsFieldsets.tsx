import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useMemo } from 'react';
import { Control, FieldErrors, UseFormSetValue, UseFormTrigger, useFieldArray } from 'react-hook-form';

import { EventFieldset } from '@ad/src/components/EventFieldset';
import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { RowForForm } from '@ad/src/utils/validation';

export interface EventsFieldsetsProps {
  control: Control<FillDeclarationSchemaType, any>;
  setValue: UseFormSetValue<FillDeclarationSchemaType>;
  trigger: UseFormTrigger<FillDeclarationSchemaType>;
  errors: FieldErrors<FillDeclarationSchemaType>['events'];
  readonly?: boolean;
}

export function EventsFieldsets({ control, setValue, trigger, errors, readonly }: EventsFieldsetsProps) {
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'events',
  });

  // const aaa =

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
              <div className={fr.cx('fr-col-12')}>
                {eventWithErrorLogic.index > 0 && <hr className={fr.cx('fr-my-3v')} />}
                <div key={eventWithErrorLogic.index} className={fr.cx('fr-col-12')}>
                  <EventFieldset
                    control={control}
                    setValue={setValue}
                    trigger={trigger}
                    eventIndex={eventWithErrorLogic.index}
                    name={`events.${eventWithErrorLogic.index}`}
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
