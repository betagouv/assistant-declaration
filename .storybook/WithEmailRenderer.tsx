import { PartialStoryFn } from 'storybook/internal/types';

import { StorybookRendererLayout } from '@ad/src/components/emails/layouts/StorybookRenderer';

export function WithEmailRenderer(Story: PartialStoryFn) {
  return (
    <StorybookRendererLayout>
      <Story />
    </StorybookRendererLayout>
  );
}
