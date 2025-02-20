import { PropsWithChildren, useEffect, useRef } from 'react';

import { htmlToClipboard } from '@ad/src/utils/clipboard';

export interface ClipboardTriggerProps {
  onCopy?: () => void;
}

export function ClipboardTrigger({ onCopy, children }: PropsWithChildren<ClipboardTriggerProps>) {
  const wrapperRef = useRef<HTMLTableElement | null>(null);

  // We have to use an unicity check because in development React is using the strict mode
  // and renders the component twice. Due to this we also cannot use `useState(() => false)` because the 2 renders
  // are totally distincts. Having 2 copy actions at the same time is breaking having HTML part into the clipboard (whereas the text part stays)
  const copiedRef = useRef(false);

  useEffect(() => {
    if (!copiedRef.current && wrapperRef.current) {
      copiedRef.current = true;

      htmlToClipboard(wrapperRef.current.innerHTML).then(() => {
        onCopy && onCopy();
      });
    }
  }, [onCopy]);

  return (
    <div ref={wrapperRef} style={{ display: 'none' }}>
      {children}
    </div>
  );
}
