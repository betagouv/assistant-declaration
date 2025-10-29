import List, { ListProps } from '@mui/material/List';

import { UploaderFileListItem } from '@ad/src/components/uploader/UploaderFileListItem';
import { EnhancedUppyFile } from '@ad/src/utils/uppy';

export interface UploaderFileListProps {
  files: EnhancedUppyFile[];
  onCancel: (file: EnhancedUppyFile) => void;
  onRemove: (file: EnhancedUppyFile) => void;
  onRetry: (file: EnhancedUppyFile) => void;
  style?: ListProps['sx'];
}

export function UploaderFileList(props: UploaderFileListProps) {
  return (
    <>
      <List dense={true} sx={props.style}>
        {props.files.map((file) => {
          const cancel = () => {
            props.onCancel(file);
          };

          const remove = () => {
            props.onRemove(file);
          };

          const retry = () => {
            props.onRetry(file);
          };

          return <UploaderFileListItem key={file.id} file={file} onCancel={cancel} onRemove={remove} onRetry={retry} />;
        })}
      </List>
    </>
  );
}
