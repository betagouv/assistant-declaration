'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import Image from 'next/image';
import NextLink from 'next/link';
import { useContext } from 'react';

import styles from '@ad/src/app/(visitor-only)/auth/sign-in/SignInPage.module.scss';
import { SignInPageContext } from '@ad/src/app/(visitor-only)/auth/sign-in/SignInPageContext';
import assistant from '@ad/src/assets/images/sign-in/assistant.svg';
import { formTitleClasses } from '@ad/src/utils/form';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function SignInPage() {
  const { ContextualSignInForm } = useContext(SignInPageContext);
  const { isDark } = useIsDark();

  return (
    <div className={fr.cx('fr-container-lg--fluid')} style={{ display: 'flex', flex: 1 }}>
      <div className={fr.cx('fr-grid-row')} style={{ flex: 1 }}>
        <div
          className={fr.cx('fr-col-12', 'fr-col-lg-7', 'fr-px-12v', 'fr-py-8v')}
          style={{
            display: 'flex',
            background: fr.colors.decisions.background.alt.blueFrance.default,
          }}
        >
          <div className={styles.description}>
            <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--middle')}>
              <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
                <h1 className={fr.cx('fr-h2')}>Simplifiez vos déclarations de spectacle</h1>
                <p>L&apos;Assistant déclaration collecte les données de billetterie afin de simplifier vos déclarations SACEM et SACD.</p>
                <NextLink href={linkRegistry.get('about', undefined)} className={fr.cx('fr-link')}>
                  <span className={fr.cx('fr-icon--sm', 'fr-icon-arrow-right-line')} style={{ marginRight: 5 }} />
                  En savoir plus
                </NextLink>
              </div>
              <div
                className={fr.cx('fr-col-12', 'fr-col-md-6')}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  height: '100%',
                  maxHeight: 400,
                }}
              >
                <Image
                  src={assistant}
                  alt=""
                  className={styles.descriptionImage}
                  style={{
                    filter: isDark ? 'invert(100%)' : undefined,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className={fr.cx('fr-col-12', 'fr-col-lg-5', 'fr-px-6v', 'fr-py-8v')}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
            <div
              className={`${fr.cx('fr-col-12', 'fr-col-sm-10', 'fr-col-md-6', 'fr-col-lg-10', 'fr-col-xl-12', 'fr-m-auto')} ${styles.formContainer}`}
            >
              <h1 className={fr.cx(...formTitleClasses)}>Se connecter</h1>
              <ContextualSignInForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
