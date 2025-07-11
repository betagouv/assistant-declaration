import { Metadata } from 'next';
import { headers } from 'next/headers';
import { PropsWithChildren } from 'react';

import { ServerLayout } from '@ad/src/app/ServerLayout';

export const metadata: Metadata = {
  title: 'Assistant déclaration',
};

export interface RootLayoutProps {}

export async function RootLayout({ children }: PropsWithChildren<RootLayoutProps>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') || undefined;

  return <ServerLayout nonce={nonce}>{children}</ServerLayout>;
}

export default RootLayout;
