// The `generated-statement.html` file has been generated on https://betagouv.github.io/a11y-generateur-declaration/
import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

import statementContent from '@ad/src/app/(public)/(compliance)/accessibility/generated-statement.html';

const cleanStatementContent = statementContent.replace('<!DOCTYPE html>', '');

function createMarkup() {
  return { __html: cleanStatementContent };
}

export function AccessibilityPage() {
  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <Alert
        severity="info"
        small={true}
        className={fr.cx('fr-mb-6v')}
        description={
          <>
            Aucun audit d&apos;accessibilité RGAA n&apos;a pour l&apos;instant été fait d&apos;où la non-conformité du produit mentionnée ci-dessous.
          </>
        }
      />
      <div dangerouslySetInnerHTML={createMarkup()}></div>
    </div>
  );
}
