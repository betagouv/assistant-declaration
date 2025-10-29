import List, { ListProps } from '@mui/material/List';
import { useMemo } from 'react';

import { FileListItem } from '@ad/src/components/FileListItem';
import { UiAttachmentSchemaType } from '@ad/src/models/entities/attachment';

export interface FileListProps<T extends UiAttachmentSchemaType> {
  files: T[];
  onRemove: (file: T) => Promise<void>;
  additionalSection?: (file: T) => React.JSX.Element;
  readonly?: boolean;
  style?: ListProps['sx'];
}

export function FileList<T extends UiAttachmentSchemaType>({ files, onRemove, additionalSection, readonly, style }: FileListProps<T>) {
  // Sort files by name for the UX
  const sortedFiles = useMemo(() => {
    return files.sort((a, b) => {
      if (a.name && b.name) return a.name.localeCompare(b.name);
      if (a.name) return -1;
      if (b.name) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [files]);

  return (
    <>
      <List dense={true} sx={style}>
        {sortedFiles.map((file) => {
          const remove = async () => {
            await onRemove(file);
          };

          return <FileListItem key={file.id} file={file} onRemove={remove} additionalSection={additionalSection} readonly={readonly} />;
        })}
      </List>
    </>
  );
}
