import { fr } from '@codegouvfr/react-dsfr';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import Image from 'next/image';
import NextLink from 'next/link';
import { ImgHTMLAttributes } from 'react';

import styles from '@ad/src/app/(public)/about/Introduction.module.scss';
import hero from '@ad/src/assets/images/hero.svg';
import billetweb from '@ad/src/assets/images/partners/billetweb.png';
import helloasso from '@ad/src/assets/images/partners/helloasso.png';
import mapado from '@ad/src/assets/images/partners/mapado.png';
import shotgun from '@ad/src/assets/images/partners/shotgun.png';
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

  return (
    <IntroductionContainer
      left={
        <div className={fr.cx('fr-py-6v', 'fr-px-8v')}>
          <h1 className={fr.cx('fr-h2', 'fr-my-4v')} style={{ maxWidth: 600 }}>
            Simplifiez vos déclarations de spectacles
          </h1>
          <Image
            src={hero}
            alt=""
            priority={true}
            className={cx(fr.cx('fr-hidden-md'), styles.hero)}
            style={{
              color: undefined, // [WORKAROUND] Ref: https://github.com/vercel/next.js/issues/61388#issuecomment-1988278891
              height: 'auto',
              maxHeight: 200,
              filter: isDark ? 'invert(100%)' : undefined,
            }}
          />
          <p className={fr.cx('fr-mb-8v')} style={{ maxWidth: 600 }}>
            L&apos;Assistant pour les déclarations du spectacle aide les diffuseurs de spectacles à remplir les formalités SACEM et SACD.
            <br />
            Il réutilise les données de billetterie pour simplifier la saisie des informations attendues par les organismes.
          </p>
          <p className={fr.cx('fr-mb-4v')} style={{ maxWidth: 600, color: fr.colors.decisions.text.mention.grey.default }}>
            Les systèmes de billetterie déjà connectés :
          </p>
          <div className={cx(styles.logos, fr.cx('fr-mb-4v'))}>
            <NextLink href="https://www.billetweb.fr" target="_blank">
              <Image src={billetweb} alt="logo de Billetweb" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </NextLink>
            <NextLink href="https://www.mapado.com" target="_blank">
              <Image src={mapado} alt="logo de Mapado" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </NextLink>
            <NextLink href="https://supersoniks.com" target="_blank">
              <Image src={supersoniks} alt="logo de Supersoniks" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </NextLink>
            <NextLink href="https://www.socoop.fr" target="_blank">
              <Image src={soticket} alt="logo de SoTicket" style={{ ...imageProps.style, filter: isDark ? 'invert(100%)' : undefined }} />
            </NextLink>
            <NextLink href="https://www.helloasso.com" target="_blank">
              <Image
                src={helloasso}
                alt="logo de HelloAsso"
                style={{ ...imageProps.style, maxHeight: 25, filter: isDark ? 'invert(100%)' : undefined }}
              />
            </NextLink>
            <NextLink href="https://pro.shotgun.live" target="_blank">
              <Image
                src={shotgun}
                alt="logo de Shotgun"
                style={{ ...imageProps.style, maxHeight: 25, filter: isDark ? 'invert(100%)' : undefined }}
              />
            </NextLink>
          </div>
        </div>
      }
      right={
        <Image
          src={hero}
          alt=""
          priority={true}
          className={styles.hero}
          style={{
            color: undefined, // [WORKAROUND] Ref: https://github.com/vercel/next.js/issues/61388#issuecomment-1988278891
            height: 'auto',
            maxHeight: 400,
            filter: isDark ? 'invert(100%)' : undefined,
          }}
        />
      }
    />
  );
}
