'use client';

import { useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

import { PublicLayout } from '@ad/src/app/(public)/PublicLayout';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { useSession } from '@ad/src/proxies/next-auth/react';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function VisitorOnlyLayout(props: PropsWithChildren) {
  const sessionWrapper = useSession();
  const router = useRouter();

  useEffect(() => {
    if (sessionWrapper.status === 'authenticated') {
      // TODO: this shows the children during a few ms... maybe the condition should be inside the useEffect too?
      // or find a better hook than triggers ASAP without making React throwing error because it's currently rendering
      // ... for now I just fixed it by forcing skeleton also when "authenticated" is true in the re-render
      router.push(linkRegistry.get('dashboard', undefined));
    }
  }, [router, sessionWrapper.status]);

  if (sessionWrapper.status !== 'unauthenticated') {
    return <LoadingArea ariaLabelTarget="contenu" />;
  }

  // Take as layout the public one
  return (
    <>
      <PublicLayout>{props.children}</PublicLayout>
    </>
  );
}
