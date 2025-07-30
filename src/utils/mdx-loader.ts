import type { Options } from '@mdx-js/loader';
import highlightPhp from 'highlight.js/lib/languages/php';
import highlightShell from 'highlight.js/lib/languages/shell';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

// We use this common to have always the same configuration between Next.js and Storybook
export const mdxLoaderOptions: Options = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [[rehypeHighlight, { languages: { php: highlightPhp, shell: highlightShell } }]],
};
