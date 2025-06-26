import { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';

// This is inspired by https://github.com/vercel/next.js/discussions/50700#discussioncomment-10134248
export function useConfirmationIfUnsavedChange(unsaved: boolean) {
  const router = useRouter();
  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (e.button !== 0) return; // only handle left-clicks
      const targetUrl = (e.currentTarget as HTMLAnchorElement).href;
      const currentUrl = window.location.href;
      if (targetUrl !== currentUrl && window.onbeforeunload) {
        // @ts-ignore
        const res = window.onbeforeunload();
        if (!res) e.preventDefault();
      }
    };

    const addAnchorListeners = () => {
      const anchorElements = document.querySelectorAll('a[href]');

      // @ts-ignore
      anchorElements.forEach((anchor) => anchor.addEventListener('click', handleAnchorClick));
    };

    const mutationObserver = new MutationObserver(addAnchorListeners);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    addAnchorListeners();

    return () => {
      mutationObserver.disconnect();
      const anchorElements = document.querySelectorAll('a[href]');

      // @ts-ignore
      anchorElements.forEach((anchor) => anchor.removeEventListener('click', handleAnchorClick));
    };
  }, []);

  useEffect(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // required for Chrome
    };

    const handlePopState = (e: PopStateEvent) => {
      if (unsaved) {
        // We cannot use our `showConfirmationDialog()` since within window listeners it must be synchronous to deal with the event object
        const confirmLeave = window.confirm('Vous avez des modifications non enregistrées, êtes-vous sûr de vouloir quitter cette page ?');

        if (!confirmLeave) {
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    if (unsaved) {
      window.addEventListener('beforeunload', beforeUnloadHandler);
      window.addEventListener('popstate', handlePopState);
    } else {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      window.removeEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [unsaved]);

  useEffect(() => {
    const originalPush = router.push;

    router.push = (url: string, options?: NavigateOptions) => {
      if (unsaved) {
        showConfirmationDialog({
          description: <>Vous avez des modifications non enregistrées, êtes-vous sûr de vouloir quitter cette page ?</>,
          onConfirm: async () => {
            originalPush(url, options);
          },
        });
      } else {
        originalPush(url, options);
      }
    };

    return () => {
      router.push = originalPush;
    };
  }, [router, unsaved, showConfirmationDialog]);
}
