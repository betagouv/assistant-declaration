import { fr } from '@codegouvfr/react-dsfr';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import { Box, Link, Typography, useMediaQuery, useTheme } from '@mui/material';
import Image from 'next/image';
import NextLink from 'next/link';
import { ImgHTMLAttributes } from 'react';

import style from '@ad/src/app/(public)/about/Introduction.module.scss';
import hero from '@ad/src/assets/images/hero.svg';
import billetweb from '@ad/src/assets/images/partners/billetweb.png';
import mapado from '@ad/src/assets/images/partners/mapado.png';
import soticket from '@ad/src/assets/images/partners/soticket.png';
import supersoniks from '@ad/src/assets/images/partners/supersoniks.png';
import { IntroductionContainer } from '@ad/src/components/IntroductionContainer';

const imageProps: ImgHTMLAttributes<HTMLImageElement> = {
  style: {
    width: 'auto',
    height: '100%',
    maxHeight: 30,
    objectFit: 'contain',
    opacity: 0.5,
  },
};

export function Introduction() {
  const { isDark } = useIsDark();
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <IntroductionContainer
      left={
        <Box
          sx={{
            pl: 4,
            pr: 4,
            py: 3,
          }}
        >
          <Typography component="h1" variant="h2" sx={{ my: 2, maxWidth: 600 }}>
            Simplifiez vos déclarations de spectacles
          </Typography>
          {!mdUp && (
            <Image
              src={hero}
              alt=""
              priority={true}
              className={style.hero}
              style={{
                color: undefined, // [WORKAROUND] Ref: https://github.com/vercel/next.js/issues/61388#issuecomment-1988278891
                height: 'auto',
                maxHeight: 200,
                filter: isDark ? 'invert(100%)' : undefined,
              }}
            />
          )}
          <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 600 }}>
            L&apos;Assistant pour les déclarations du spectacle aide les diffuseurs de spectacles à remplir les formalités SACEM, SACD, CNM et ASTP.
            <br />
            Il réutilise les données de billetterie pour simplifier la saisie des informations attendues par les organismes.
          </Typography>
          <Typography sx={{ color: fr.colors.decisions.text.mention.grey.default, mb: 2, maxWidth: 600 }}>
            Les systèmes de billetterie déjà connectés :
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
            <Link
              component={NextLink}
              href="https://www.billetweb.fr"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={billetweb} alt="logo de Billetweb" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </Link>
            <Link
              component={NextLink}
              href="https://www.mapado.com"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={mapado} alt="logo de Mapado" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </Link>
            <Link
              component={NextLink}
              href="https://supersoniks.com"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={supersoniks} alt="logo de Supersoniks" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </Link>
            <Link
              component={NextLink}
              href="https://www.socoop.fr"
              target="_blank"
              underline="none"
              sx={{
                backgroundImage: 'none !important',
                '&::after': {
                  display: 'none !important',
                },
              }}
            >
              <Image src={soticket} alt="logo de SoTicket" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </Link>
          </Box>
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
            height: 'auto',
            filter: isDark ? 'invert(100%)' : undefined,
          }}
        />
      }
    />
  );
}
