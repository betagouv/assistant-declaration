import { PropsWithChildren, useEffect, useRef } from 'react';

import { htmlToClipboard } from '@ad/src/utils/clipboard';

export interface ClipboardTriggerProps {
  onCopy?: () => void;
}

export function ClipboardTrigger({ onCopy, children }: PropsWithChildren<ClipboardTriggerProps>) {
  const wrapperRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    if (wrapperRef.current) {
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
