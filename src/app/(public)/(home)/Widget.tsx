import { fr } from '@codegouvfr/react-dsfr';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Image, { StaticImageData } from 'next/image';

export interface WidgetProps {
  icon: StaticImageData;
  title: string;
  children: React.ReactNode;
}

export function Widget({ children, title, icon }: WidgetProps) {
  const { isDark } = useIsDark();

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: fr.colors.decisions.background.alt.yellowTournesol.default,
        textAlign: 'center',
        px: 3,
        py: 3,
        border: 0,
      }}
    >
      <Box
        sx={{
          width: '60%',
          height: {
            xs: 50,
            sm: 100,
            md: 150,
          },
          mx: 'auto',
        }}
      >
        <Image
          src={icon}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: isDark ? 'invert(100%)' : undefined,
          }}
        />
      </Box>
      <Typography component="div" variant="h6" fontWeight="bold" sx={{ mt: 2, mb: 3 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
