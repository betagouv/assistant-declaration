import { useTranslation } from 'react-i18next';

import { EventWrapperSchemaType } from '@ad/src/models/entities/event';

export interface EventSalesTableProps {
  wrapper: EventWrapperSchemaType;
  onRowUpdate: (updatedRow: unknown) => Promise<void>;
  readonly?: boolean;
}

export function EventSalesTable({ wrapper, onRowUpdate, readonly }: EventSalesTableProps) {
  const { t } = useTranslation('common');

  return <>TODO</>;
}
