import { fr } from '@codegouvfr/react-dsfr';

import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';

export function Partners() {
  const { showLiveChat } = useLiveChat();

  return (
    <div className={fr.cx('fr-container')}>
      <div
        className={fr.cx('fr-py-12v', 'fr-px-6v', 'fr-mx-auto')}
        style={{
          backgroundColor: fr.colors.decisions.background.actionLow.blueFrance.default,
          textAlign: 'center',
          maxWidth: 800,
          borderRadius: 5,
        }}
      >
        <span className={fr.cx('fr-h6')}>Vous êtes éditeur ?</span>
        <p className={fr.cx('fr-my-0')}>
          <a href="#" onClick={showLiveChat} className={fr.cx('fr-link')}>
            Contactez notre équipe technique
          </a>{' '}
          pour proposer le service à vos clients !
        </p>
      </div>
    </div>
  );
}
