import { fr } from '@codegouvfr/react-dsfr';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import Image from 'next/image';

import clockIsTicking from '@ad/src/assets/images/home/clock-is-ticking.svg';

export function KeyReasons() {
  const { isDark } = useIsDark();

  return (
    <div className={fr.cx('fr-container', 'fr-pt-16v', 'fr-pb-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-4', 'fr-col-lg-5')}>
          <Image
            src={clockIsTicking}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              maxHeight: 380,
              objectFit: 'contain',
              objectPosition: 'left',
              filter: isDark ? 'invert(100%)' : undefined,
            }}
          />
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-7')}>
          <div className={fr.cx('fr-h3')}>Pourquoi un Assistant pour les déclarations du spectacle ?</div>
          <p>
            <span className={fr.cx('fr-text--bold')}>Pour gagner du temps :</span> chaque mois, vous devez déclarer plusieurs fois les mêmes
            informations auprès des organismes. L&apos;Assistant a pour objectif de simplifier cette tâche.
            <br />
            <br />
            Dans sa version actuelle, l&apos;Assistant :
            <ol className={fr.cx('fr-text--bold')}>
              <li>Récupère automatiquement vos données,</li>
              <li>Pré-remplit vos formulaires,</li>
              <li>Accélère vos démarches de déclaration.</li>
            </ol>
            <br />
            La possibilité de télétransmettre les données via l&apos;Assistant sera étudiée dans un second temps.
          </p>
        </div>
      </div>
    </div>
  );
}
