import { Container } from '@mui/material';

import statementContent from '@ad/src/app/(public)/(compliance)/terms-of-use/content.transformed.html';

function createMarkup() {
  return { __html: statementContent };
}

export function TermsOfUsePage() {
  return (
    <Container
      sx={{
        py: 6,
      }}
    >
      <div dangerouslySetInnerHTML={createMarkup()}></div>
    </Container>
  );
}
