'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import { IframeResizer } from '@open-iframe-resizer/react';
import { useMemo } from 'react';

export interface ImpactPageProps {
  metabaseIframeUrl: string | null;
}

export function ImpactPage({ metabaseIframeUrl }: ImpactPageProps) {
  const { isDark } = useIsDark();

  const adjustedMetabaseIframeUrl = useMemo(() => {
    if (!metabaseIframeUrl) {
      return null;
    }

    const iframeUrl = new URL(metabaseIframeUrl);
    iframeUrl.hash = `#background=false&bordered=false&titled=false${isDark ? '&theme=night' : ''}`; // `locale=fr` is only available in the paid version

    return iframeUrl;
  }, [metabaseIframeUrl, isDark]);

  return (
    <div
      className={fr.cx('fr-container', 'fr-py-12v')}
      style={{
        // Make sure to take the full height so the loader area is taking the page until the iframe resize logic
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h1>Mesures d&apos;impact</h1>
      {adjustedMetabaseIframeUrl ? (
        <IframeResizer
          src={adjustedMetabaseIframeUrl.toString()}
          title="Mesures d'impact"
          enableLegacyLibSupport={true}
          style={{
            width: '100%',
            minHeight: 300, // Minimum in case `height: scretch` is not supported in the browser
            height: 'stretch', // We cannot use `flex: 1` because IframeResizer is setting `height` after the compute, and it would not adjust the iframe height if any flex value
            border: 0,
            backgroundColor: 'transparent',
          }}
        />
      ) : (
        <Alert
          severity="info"
          small={true}
          className={fr.cx('fr-mb-6v')}
          description={<>Les mesures d&apos;impact ne sont pas disponibles sur l&apos;environnement actuel.</>}
        />
      )}
    </div>
  );
}
