import { LoadingButton as Button } from '@mui/lab';
import { Box, Typography } from '@mui/material';
import Image from 'next/image';

import style from '@ad/src/app/(public)/(home)/Introduction.module.scss';
import hero from '@ad/src/assets/images/hero.png';
import { IntroductionContainer } from '@ad/src/components/IntroductionContainer';
import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';

export function Introduction() {
  const { showLiveChat, isLiveChatLoading } = useLiveChat();

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
            S&apos;aider de son logiciel de billetterie pour faire ses déclarations
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
            <Typography component="span" sx={{ fontWeight: 'bold' }}>
              Assistant déclaration
            </Typography>{' '}
            est un service destiné aux professionnels œuvrant dans le secteur de la culture et du spectacle vivant. En se connectant au système de
            billetterie, il permet de pré-remplir automatiquement les champs de déclaration auprès des différents organismes.
          </Typography>
          <Button onClick={showLiveChat} loading={isLiveChatLoading} size="large" variant="contained" sx={{ mb: 3 }}>
            Demander accès à l&apos;outil
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
