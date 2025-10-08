import { Control, FieldErrors, UseFormTrigger } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';

export interface EventFieldsetProps {
  control: Control<FillDeclarationSchemaType, any>;
  trigger: UseFormTrigger<FillDeclarationSchemaType>;
  name: `events.${number}`;
  errors: NonNullable<Extract<FieldErrors<FillDeclarationSchemaType>['events'], any[]>>[number];
  readonly?: boolean;
}

export function EventFieldset({ control, trigger, name, errors, readonly }: EventFieldsetProps) {
  const { t } = useTranslation('common');

  return (
    <div>
      {/* <Controller
        control={control}
        name={`${name}.date`} // 👈 scoped to this event
        render={({ field }) => (
          <input
            type="date"
            {...field}
            disabled={readonly}
          />
        )}
      /> */}
    </div>
  );
}
