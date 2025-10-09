import { fr } from '@codegouvfr/react-dsfr';

import statementContent from '@ad/src/app/(public)/(compliance)/legal-notice/content.transformed.html';

function createMarkup() {
  return { __html: statementContent };
}

export function LegalNoticePage() {
  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div dangerouslySetInnerHTML={createMarkup()}></div>
    </div>
  );
}
