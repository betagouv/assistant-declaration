import { GridColDef } from '@mui/x-data-grid';

export const RowEditActionsCell: NonNullable<GridColDef<any, any>>['renderCell'] = ({ id, api }) => {
  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const beingEdited: boolean = useMemo(() => {
    // We want the `useMemo` to react less frequently than with a direct `params.api.getRowMode(params.id)`
    return !!params.api.state.editRows[params.id];
  }, [params.api.state.editRows, params.id]);

  return null;

  //   return (
  // <>
  //               {beingEdited ? (
  //                 <>
  //                   <IconButton
  //                     aria-label="soumettre les modifications de la ligne de recette"
  //                     onClick={() => {
  //                       params.api.stopRowEditMode({
  //                         id: params.id,
  //                         ignoreModifications: false,
  //                       });
  //                     }}
  //                     size="small"
  //                   >
  //                     <Done />
  //                   </IconButton>
  //                   <IconButton
  //                     aria-label="annuler les modifications de la ligne de recette"
  //                     onClick={() => {
  //                       params.api.stopRowEditMode({
  //                         id: params.id,
  //                         ignoreModifications: true,
  //                       });
  //                     }}
  //                     size="small"
  //                   >
  //                     <Clear />
  //                   </IconButton>
  //                 </>
  //               ) : (
  //                 <>
  //                   <IconButton
  //                     aria-label="modifier la ligne de recette"
  //                     onClick={() => {
  //                       params.api.startRowEditMode({
  //                         id: params.id,
  //                         fieldToFocus: `${rowTypedNameof('data')}.${entryTypedNameof('category')}`,
  //                       });
  //                     }}
  //                     size="small"
  //                   >
  //                     <Edit />
  //                   </IconButton>
  //                   <IconButton
  //                     disabled={params.row.data.category !== AccountingCategorySchema.Values.OTHER_REVENUES}
  //                     aria-label="enlever la ligne de recette"
  //                     onClick={() => {
  //                       showConfirmationDialog({
  //                         description: (
  //                           <>
  //                             Êtes-vous sûr de vouloir supprimer la ligne{' '}
  //                             <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
  //                               XXXXXXXXXXXX
  //                             </Typography>{' '}
  //                             ?
  //                           </>
  //                         ),
  //                         onConfirm: async () => {
  //                           // Note: here `trigger` won't help since the visual error will disappear with the row, and an `BaseForm` error alert has no reason to change
  //                           remove(params.row.index);
  //                         },
  //                       });
  //                     }}
  //                     size="small"
  //                   >
  //                     <Delete />
  //                   </IconButton>
  //                 </>
  //               )}
  //             </>
  //   );
};
