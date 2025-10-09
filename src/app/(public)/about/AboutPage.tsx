'use client';

import { Introduction } from '@ad/src/app/(public)/about/Introduction';
import { KeyReasons } from '@ad/src/app/(public)/about/KeyReasons';
import { Partners } from '@ad/src/app/(public)/about/Partners';
import { QuickLinks } from '@ad/src/app/(public)/about/QuickLinks';
import { FrequentlyAskedQuestions } from '@ad/src/app/(public)/frequently-asked-questions/FrequentlyAskedQuestions';

export function AboutPage() {
  return (
    <div style={{ width: '100%' }}>
      <Introduction />
      <KeyReasons />
      <QuickLinks />
      <Partners />
      <FrequentlyAskedQuestions />
    </div>
  );
}
