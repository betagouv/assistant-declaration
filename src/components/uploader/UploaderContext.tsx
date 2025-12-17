import { createContext } from 'react';

import { UploaderFileList } from '@ad/src/components/uploader/UploaderFileList';

export const UploaderContext = createContext({
  ContextualUploaderFileList: UploaderFileList,
});
