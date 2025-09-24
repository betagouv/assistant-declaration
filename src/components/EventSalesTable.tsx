import { useTranslation } from 'react-i18next';

import {
  EventCategoryTicketsSchemaType,
  EventWrapperSchemaType,
  SalesWrapperSchemaType,
  TicketCategorySchemaType,
} from '@ad/src/models/entities/event';
import { nameof } from '@ad/src/utils/typescript';

const salesTypedNameof = nameof<SalesWrapperSchemaType>;
const eventCategoryTicketsTypedNameof = nameof<EventCategoryTicketsSchemaType>;
const ticketCategoryTypedNameof = nameof<TicketCategorySchemaType>;

export interface EventSalesTableProps {
  wrapper: EventWrapperSchemaType;
  onRowUpdate: (updatedRow: SalesWrapperSchemaType) => Promise<void>;
  readonly?: boolean;
}

export function EventSalesTable({ wrapper, onRowUpdate, readonly }: EventSalesTableProps) {
  const { t } = useTranslation('common');

  return <>TODO</>;
}
