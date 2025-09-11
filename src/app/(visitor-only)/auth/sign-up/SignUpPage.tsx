'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import humanCooperation from '@gouvfr/dsfr/dist/artwork/pictograms/environment/human-cooperation.svg';
import Image from 'next/image';
import { useContext, useState } from 'react';

import styles from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpPage.module.scss';
import { SignUpPageContext } from '@ad/src/app/(visitor-only)/auth/sign-up/SignUpPageContext';
import { formTitleClasses } from '@ad/src/utils/form';

export function SignUpPage() {
  const { ContextualSignUpForm } = useContext(SignUpPageContext);

  const [success, setSuccess] = useState(false);

  return (
    <div className={fr.cx('fr-container-lg--fluid')} style={{ display: 'flex', flex: 1 }}>
      <div className={fr.cx('fr-grid-row')} style={{ flex: 1 }}>
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
              {success ? (
                <Alert
                  severity="success"
                  small={false}
                  title="Succès"
                  description="Votre inscription a bien été prise en compte. Vous allez recevoir un email à l'adresse indiquée pour confirmer votre inscription."
                />
              ) : (
                <>
                  <h1 className={fr.cx(...formTitleClasses)}>Inscription</h1>
                  <ContextualSignUpForm
                    onSuccess={() => {
                      setSuccess(true);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        <div
          className={fr.cx('fr-col-12', 'fr-col-lg-7', 'fr-px-12v', 'fr-py-8v')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: fr.colors.decisions.background.alt.blueFrance.default,
          }}
        >
          <Image src={humanCooperation} alt="" priority={true} className={styles.descriptionImage} />
          <div className={styles.description}>
            <span className={fr.cx('fr-text--bold')}>Les raisons de s&apos;inscrire sur la plateforme :</span>
            <ol>
              <li>Un lien direct entre vos données de billetterie et vos déclarations</li>
              <li>Centraliser gratuitement vos étapes de déclarations</li>
              <li>Ne plus garder de données spectateurs sensibles sur votre ordinateur</li>
              <li>Bénéficier d&apos;un outil qui évolue au fil de vos retours utilisateurs</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
