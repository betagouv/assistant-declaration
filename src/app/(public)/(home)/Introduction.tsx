import Button from '@mui/lab/LoadingButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import NextLink from 'next/link';

import style from '@ad/src/app/(public)/(home)/Introduction.module.scss';
import hero from '@ad/src/assets/images/hero.png';
import { IntroductionContainer } from '@ad/src/components/IntroductionContainer';
import { linkRegistry } from '@ad/src/utils/routes/registry';

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
          <Typography component="h1" variant="h2" sx={{ my: 2, maxWidth: 500 }}>
            Simplifiez la déclaration de vos spectacles
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
            L&apos;Assistant déclaration collecte les données de billetteries afin de vous aider à réaliser vos déclarations SACEM, SACD, ASTP, CNM.
          </Typography>
          <Button component={NextLink} href={linkRegistry.get('signUp', undefined)} size="large" variant="contained" sx={{ mb: 3 }}>
            Tester l&apos;assistant
          </Button>
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
