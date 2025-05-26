import { Container } from '@mui/material';

import statementContent from '@ad/src/app/(public)/(compliance)/privacy-policy/content.transformed.html';

function createMarkup() {
  return { __html: statementContent };
}

export function PrivacyPolicyPage() {
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
