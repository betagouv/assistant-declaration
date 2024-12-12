import { fr } from '@codegouvfr/react-dsfr';
import { Box, Paper, Typography } from '@mui/material';

export function Widget({ children, title, icon }: { children: any; title: string; icon: any }) {
  return (
    <Paper variant="outlined" sx={{ height: '100%', px: 4, py: 3 }}>
      <Typography component="div" variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
        <Box
          sx={{
            display: 'inline-block',
            color: fr.colors.decisions.text.title.blueFrance.default,
            lineHeight: 0,
            verticalAlign: 'middle',
            mr: 1,
          }}
        >
          {icon}
        </Box>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
