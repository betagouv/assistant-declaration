// The `generated-statement.html` file has been generated on https://betagouv.github.io/a11y-generateur-declaration/
import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';

import statementContent from '@ad/src/app/(public)/(compliance)/accessibility/generated-statement.html';

const cleanStatementContent = statementContent.replace('<!DOCTYPE html>', '');

function createMarkup() {
  return { __html: cleanStatementContent };
}

export function AccessibilityPage() {
  return (
    <Container
      sx={{
        py: 6,
      }}
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        Aucun audit d&apos;accessibilité RGAA n&apos;a pour l&apos;instant été fait d&apos;où la non-conformité du produit mentionnée ci-dessous.
      </Alert>
      <div dangerouslySetInnerHTML={createMarkup()}></div>
    </Container>
  );
}
