'use client';

import { fr } from '@codegouvfr/react-dsfr';

import { FrequentlyAskedQuestions } from '@ad/src/app/(public)/frequently-asked-questions/FrequentlyAskedQuestions';

export function FrequentlyAskedQuestionsPage() {
  return (
    <div className={fr.cx('fr-container')}>
      <FrequentlyAskedQuestions />
    </div>
  );
}
