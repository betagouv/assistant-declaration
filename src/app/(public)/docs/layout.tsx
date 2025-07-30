import { PropsWithChildren } from 'react';

import { DocsLayout } from '@ad/src/app/(public)/docs/DocsLayout';

export default function Layout(props: PropsWithChildren) {
  return <DocsLayout>{props.children}</DocsLayout>;
}
