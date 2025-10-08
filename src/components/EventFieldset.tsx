import { fr } from '@codegouvfr/react-dsfr';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Control, Controller, FieldErrors, UseFormTrigger } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';

export interface EventFieldsetProps {
  control: Control<FillDeclarationSchemaType, any>;
  trigger: UseFormTrigger<FillDeclarationSchemaType>;
  name: `events.${number}`;
  errors: FieldErrors<NonNullable<FillDeclarationSchemaType>['events']>[0];
  readonly?: boolean;
}

export function EventFieldset({ control, trigger, name, errors, readonly }: EventFieldsetProps) {
  const { t } = useTranslation('common');

  return (
    <div className={fr.cx('fr-grid-row')}>
      <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
        <Controller
          control={control}
          name={`${name}.freeTickets`}
          render={({ field: { ref, ...fieldOthers }, fieldState: { error }, formState }) => {
            return (
              <Input
                ref={ref}
                label="Billets gratuits"
                state={!!error ? 'error' : undefined}
                stateRelatedMessage={error?.message}
                nativeInputProps={{
                  ...fieldOthers,
                  type: 'number',
                  placeholder: '0',
                  step: 1,
                  min: 0,
                  onWheel: (event) => {
                    // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

                    // `event.currentTarget` is a callable type but is targetting the MUI element
                    // whereas `event.target` targets the input element but does not have the callable type, so casting
                    (event.target as HTMLInputElement).blur();
                  },
                }}
              />
            );
          }}
        />
      </div>
    </div>
  );
}
