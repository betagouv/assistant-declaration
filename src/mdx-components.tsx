import type { MDXComponents } from 'mdx/types';

import { overridenComponents } from '@ad/src/utils/mdx';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...overridenComponents,
  };
}
