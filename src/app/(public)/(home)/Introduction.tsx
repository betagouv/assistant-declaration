import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Image from 'next/image';

import style from '@ad/src/app/(public)/(home)/Introduction.module.scss';
import hero from '@ad/src/assets/images/hero.png';
import { IntroductionContainer } from '@ad/src/components/IntroductionContainer';

export function Introduction() {
  return (
    <IntroductionContainer
      left={
        <Box
          sx={{
            px: 4,
            py: 3,
            textAlign: { xs: 'center', md: 'left' },
          }}
        >
          <Typography component="h1" variant="h2" sx={{ my: 2, maxWidth: 600 }}>
            Simplifiez vos déclarations de spectacles
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 600 }}>
            L&apos;Assistant pour les déclarations du spectacle aide les diffuseurs de spectacles à remplir les formalités SACEM, SACD, CNM ASTP.
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 600 }}>
            Ce service est en construction par le Ministère de la Culture, il évoluera d&apos;après les retours des utilisateurs.
          </Typography>
        </Box>
      }
      right={
        <Image
          src={hero}
          alt=""
          priority={true}
          className={style.hero}
          style={{
            color: undefined, // [WORKAROUND] Ref: https://github.com/vercel/next.js/issues/61388#issuecomment-1988278891
          }}
        />
      }
    />
  );
}
