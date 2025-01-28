import { Box, Tooltip } from '@mui/material';
import { GridAutosizeOptions, type GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import debounce from 'lodash.debounce';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SacdAudienceSchemaType } from '@ad/src/models/entities/declaration/sacd';
import { EventSchemaType, EventWrapperSchemaType } from '@ad/src/models/entities/event';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { nameof } from '@ad/src/utils/typescript';

type Row = EventWrapperSchemaType & {
  audience: SacdAudienceSchemaType | null;
  taxRate: number;
  freeTickets: number;
  paidTickets: number;
  includingTaxesAmount: number;
};

const eventWrapperTypedNameof = nameof<EventWrapperSchemaType>;
const eventTypedNameof = nameof<EventSchemaType>;

export interface SacdTicketingEntriesTableProps {
  wrappers: EventWrapperSchemaType[];
  audience: SacdAudienceSchemaType | null;
  taxRate: number;
}

export function SacdTicketingEntriesTable({ wrappers, audience, taxRate }: SacdTicketingEntriesTableProps) {
  const { t } = useTranslation('common');

  const apiRef = useGridApiRef();

  const [autosizeOption] = useState<GridAutosizeOptions>({
    includeOutliers: true,
    includeHeaders: true,
    outliersFactor: 1.5,
    expand: true,
  });

  const rows = useMemo(() => {
    return wrappers.map((wrapper, index): Row => {
      let freeTickets: number = 0;
      let paidTickets: number = 0;
      let includingTaxesAmount: number = 0;

      for (const sale of wrapper.sales) {
        const total = sale.eventCategoryTickets.totalOverride ?? sale.eventCategoryTickets.total;
        const price = sale.eventCategoryTickets.priceOverride ?? sale.ticketCategory.price;

        if (price === 0) {
          freeTickets += total;
        } else {
          paidTickets += total;
          includingTaxesAmount += total * price;
        }
      }

      return {
        ...wrapper,
        audience: audience,
        taxRate: taxRate,
        freeTickets: freeTickets,
        paidTickets: paidTickets,
        includingTaxesAmount: includingTaxesAmount,
      };
    });
  }, [wrappers, audience, taxRate]);

  useEffect(() => {
    // We also autosize when the frame is changing
    // Note: using `onResize` is triggered sometimes for internal DataGrid things so it's not relevent for us
    const update = debounce(() => {
      apiRef.current.autosizeColumns(autosizeOption);
    }, 50);

    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
    };
  }, [apiRef, autosizeOption]);

  // To type options functions have a look at https://github.com/mui/mui-x/pull/4064
  const [columns] = useState<GridColDef<(typeof rows)[0]>[]>(() => [
    {
      field: `${eventWrapperTypedNameof('event')}.${eventTypedNameof('startAt')}`,
      headerName: 'Date et heure de représentation',
      renderCell: (params) => {
        return (
          <Tooltip title={'Cette date est non modifiable car elle provient de votre système de billetterie'}>
            <span data-sentry-mask>{capitalizeFirstLetter(t('date.longWithTime', { date: params.row.event.startAt }))}</span>
          </Tooltip>
        );
      },
    },
    {
      field: `eventCount`,
      headerName: 'Nombre',
      type: 'number',
      renderCell: (params) => {
        return (
          <Tooltip title={'Cette valeur est non modifiable car elle provient de votre système de billetterie'}>
            <span>1</span>
          </Tooltip>
        );
      },
    },
    {
      field: `audience`,
      headerName: 'Nature',
      renderCell: (params) => {
        return (
          <Tooltip title={'Cette valeur a été renseignée juste au-dessus de ce tableau'}>
            <span>{params.row.audience ? t(`model.sacdDeclaration.audience.enum.${params.row.audience}`) : '-'}</span>
          </Tooltip>
        );
      },
    },
    {
      field: `totalAmount`,
      headerName: 'Montant TTC',
      type: 'number',
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
            }
          >
            <span data-sentry-mask>{t('currency.amount', { amount: params.row.includingTaxesAmount })}</span>
          </Tooltip>
        );
      },
    },
    {
      field: `taxRate`,
      headerName: 'Taux de TVA',
      type: 'number',
      renderCell: (params) => {
        return (
          <Tooltip title={'Cette valeur est non modifiable car elle provient de votre système de billetterie'}>
            <span>{taxRate * 100}%</span>
          </Tooltip>
        );
      },
    },
    {
      field: `paidTickets`,
      headerName: 'Payant(s)',
      type: 'number',
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
            }
          >
            <span data-sentry-mask>{params.row.paidTickets}</span>
          </Tooltip>
        );
      },
    },
    {
      field: `freeTickets`,
      headerName: 'Exonéré(s)',
      type: 'number',
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
            }
          >
            <span data-sentry-mask>{params.row.freeTickets}</span>
          </Tooltip>
        );
      },
    },
  ]);

  useEffect(() => {
    if ('autosizeColumns' in apiRef.current) {
      apiRef.current.autosizeColumns(autosizeOption);
    }
  }, [columns, apiRef, autosizeOption]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <DataGrid
        apiRef={apiRef}
        rows={rows}
        getRowId={(row) => row.event.id}
        columns={columns}
        hideFooter={true}
        disableColumnFilter
        disableColumnMenu
        disableRowSelectionOnClick
        autosizeOnMount={true}
        autosizeOptions={autosizeOption}
        disableVirtualization={true}
        aria-label="tableau de la billetterie prérempli"
        data-sentry-mask
      />
    </Box>
  );
}
