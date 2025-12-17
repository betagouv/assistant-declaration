import { Button as DsfrButton, ButtonProps as DsfrButtonProps } from '@codegouvfr/react-dsfr/Button';
import { RiLoader4Fill } from '@remixicon/react';
import { useMemo } from 'react';

import styles from '@ad/src/components/Button.module.scss';

// Due to complex union types it cannot be a simple interface to match the expected component
export type ButtonProps = DsfrButtonProps & {
  loading?: boolean;
};

export function Button({ children, loading, disabled, ...props }: ButtonProps) {
  const virtualDisabled = useMemo(() => loading || disabled, [loading, disabled]);

  return (
    <DsfrButton
      {...props}
      className={`${props.className ?? ''} ${styles.button}`}
      disabled={virtualDisabled as any} // Due to complex union types disabled may not be usable some times so just casting for the ease
    >
      <RiLoader4Fill size={24} className={`${styles.spinner} ${loading ? styles.loading : ''}`} />
      <div className={`${styles.text} ${loading ? styles.loading : ''}`}>{children}</div>
    </DsfrButton>
  );
}
