import { fr } from '@codegouvfr/react-dsfr';
import { RiLoader4Fill } from '@remixicon/react';

import styles from '@ad/src/components/LoadingArea.module.scss';

export interface LoadingAreaProps {
  ariaLabelTarget: string;
  minHeight?: string | null;
  height?: string | null;
  loaderSize?: number | 'medium' | 'large' | 'small';
}

export function LoadingArea(props: LoadingAreaProps) {
  const ariaLabel = `zone en cours de chargement - ${props.ariaLabelTarget}`;
  let loaderSize: number;

  if (!props.loaderSize || props.loaderSize === 'medium') {
    loaderSize = 40;
  } else if (props.loaderSize === 'large') {
    loaderSize = 50;
  } else if (props.loaderSize === 'small') {
    loaderSize = 30;
  } else {
    throw new Error('wrong loader size provided');
  }

  return (
    <div role="progressbar" className={styles.container} aria-label={ariaLabel}>
      <RiLoader4Fill
        size={loaderSize}
        className={styles.spinner}
        style={{
          color: fr.colors.decisions.background.flat.blueFrance.default,
        }}
      />
    </div>
  );
}
