import { fr } from '@codegouvfr/react-dsfr';
import NextLink from 'next/link';

import { Widget } from '@ad/src/app/(public)/about/Widget';
import computer from '@ad/src/assets/images/home/computer.svg';
import delivery from '@ad/src/assets/images/home/delivery.svg';
import gesture from '@ad/src/assets/images/home/gesture.svg';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function QuickLinks() {
  return (
    <div className={fr.cx('fr-container', 'fr-pt-8v', 'fr-pb-16v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center', 'fr-grid-row--gutters')}>
        <div className={fr.cx('fr-col-12', 'fr-col-sm-6', 'fr-col-md-4')}>
          <Widget icon={delivery} title="Une démo ? Une question ? Un retour sur le service ?">
            <p className={fr.cx('fr-mb-8v')}>N&apos;hésitez pas cela nous aidera à améliorer l&apos;outil.</p>
            <NextLink
              href="mailto:contact@assistant-declaration.beta.gouv.fr"
              className={fr.cx('fr-btn', 'fr-mt-auto', 'fr-mx-auto', 'fr-mb-8v')}
              style={{ width: 'fit-content' }}
            >
              Contactez-nous
            </NextLink>
          </Widget>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-sm-6', 'fr-col-md-4')}>
          <Widget icon={computer} title="Accéder à l'outil">
            <p className={fr.cx('fr-mb-8v')}>
              Créez votre compte et testez l&apos;outil. Vous serez accompagné pour connecter votre système de billetterie.
            </p>
            <NextLink
              href={linkRegistry.get('dashboard', undefined)}
              className={fr.cx('fr-btn', 'fr-mt-auto', 'fr-mx-auto', 'fr-mb-8v')}
              style={{ width: 'fit-content' }}
            >
              Accédez à l&apos;outil
            </NextLink>
          </Widget>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-sm-6', 'fr-col-md-4')}>
          <Widget icon={gesture} title="Participez à la co-construction">
            <p className={fr.cx('fr-mb-8v')}>
              L&apos;Assistant évolue via une démarche itérative basée sur les retours des utilisateurs. Nous cherchons des testeurs pour
              co-construire.
            </p>
            <NextLink
              href="https://atelier-numerique.notion.site/21447c728624818e8a49d9af2058d985"
              target="_blank"
              className={fr.cx('fr-btn', 'fr-mt-auto', 'fr-mx-auto', 'fr-mb-8v')}
              style={{ width: 'fit-content' }}
            >
              Participez
            </NextLink>
          </Widget>
        </div>
      </div>
    </div>
  );
}
