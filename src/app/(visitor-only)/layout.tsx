'use client';

import { PropsWithChildren } from 'react';

import { VisitorOnlyLayout } from '@ad/src/app/(visitor-only)/VisitorOnlyLayout';

export default function Layout(props: PropsWithChildren) {
  return <VisitorOnlyLayout>{props.children}</VisitorOnlyLayout>;
}
