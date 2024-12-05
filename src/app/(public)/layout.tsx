'use client';

import { PropsWithChildren } from 'react';

import { PublicLayout } from '@ad/src/app/(public)/PublicLayout';

export default function Layout(props: PropsWithChildren) {
  return <PublicLayout>{props.children}</PublicLayout>;
}
