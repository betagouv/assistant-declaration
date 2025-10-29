import { fr } from '@codegouvfr/react-dsfr';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import { useMemo } from 'react';
import { DefaultExtensionType, FileIcon as ReactFileIcon, defaultStyles } from 'react-file-icon';

import { getExtensionsFromMime } from '@ad/src/utils/attachment';

export interface FileIconProps {
  extension?: string;
  contentType?: string;
}

export function FileIcon({ extension, contentType }: FileIconProps) {
  const { isDark } = useIsDark();
  const theme = fr.colors.getHex({ isDark });

  const formattedExtension = useMemo<string>(() => {
    let tmpExtension: string;

    if (!extension) {
      if (contentType) {
        const potentialExtensions = getExtensionsFromMime(contentType);

        tmpExtension = potentialExtensions[0] || '';
      } else {
        tmpExtension = '';
      }
    } else {
      tmpExtension = extension;
    }

    return tmpExtension.replaceAll('.', ''); // The underlying library expects no dot
  }, [extension, contentType]);

  return (
    <>
      <ReactFileIcon
        fold={true}
        foldColor={theme.decisions.background.contrast.grey.default}
        color={theme.decisions.background.alt.grey.default}
        glyphColor={theme.decisions.border.default.grey.default}
        gradientColor="transparent"
        labelColor={theme.decisions.text.label.blueFrance.default}
        labelTextColor={theme.decisions.background.overlap.grey.default}
        radius={0}
        extension={formattedExtension}
        type={defaultStyles[formattedExtension as DefaultExtensionType]?.type}
      />
    </>
  );
}
