'use client';

import { PublicLayout } from '@ad/src/app/(public)/PublicLayout';
import { ErrorPage, error404Props, error500Props } from '@ad/src/components/ErrorPage';

export interface ErrorLayoutProps {
  code: number;
}

export function ErrorLayout({ code }: ErrorLayoutProps) {
  return <PublicLayout>{code === 404 ? <ErrorPage {...error404Props} /> : <ErrorPage {...error500Props} />}</PublicLayout>;
}
