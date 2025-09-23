import { fr } from '@codegouvfr/react-dsfr';

export function IntroductionContainer({ left, right }: { left: React.ReactElement; right: React.ReactElement }) {
  return (
    <div
      style={{
        backgroundColor: fr.colors.decisions.background.actionLow.blueFrance.default,
        overflow: 'hidden',
      }}
    >
      <div
        className={fr.cx('fr-container')}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          minHeight: 'min(calc(100vh - 120px), 550px)',
          transition: '0.3s',
        }}
      >
        <div
          className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mx-auto')}
          style={{
            alignItems: 'center',
            flexWrap: 'nowrap',
            height: '100%',
          }}
        >
          <div className={fr.cx('fr-col-12', 'fr-col-md-7', 'fr-col-lg-7', 'fr-m-auto')}>{left}</div>
          <div className={fr.cx('fr-col-12', 'fr-col-md-5', 'fr-col-lg-5')}>
            <div aria-hidden="true">{right}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
