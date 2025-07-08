import { fr } from '@codegouvfr/react-dsfr';
import { CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { Grid } from '@mui/material';

export interface PasswordFieldHinterItemProps {
  text: string;
  valid: boolean;
}

export function PasswordFieldHinterItem(props: PasswordFieldHinterItemProps) {
  return (
    <>
      <Grid item component="li" xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
        {props.valid ? (
          <CheckBox fontSize="small" sx={{ color: fr.colors.decisions.text.actionHigh.blueFrance.default, mr: 1 }} />
        ) : (
          <CheckBoxOutlineBlank fontSize="small" sx={{ color: fr.colors.decisions.text.actionHigh.blueFrance.default, mr: 1 }} />
        )}
        {props.text}
      </Grid>
    </>
  );
}
