import { usePDF } from '@react-pdf/renderer';
import { PartialStoryFn } from 'storybook/internal/types';

export const commonDocumentsParameters = {
  layout: 'fullscreen',
};

export function WithDocumentRenderer(Story: PartialStoryFn) {
  const [instance, updateInstance] = usePDF({
    document: (
      <>
        <Story />
      </>
    ),
  });

  if (instance.loading) {
    return <div>Rendering the PDF...</div>;
  } else if (instance.error) {
    return <div>Something went wrong: {instance.error}</div>;
  } else if (!instance.url) {
    return <div>Initializing the renderer</div>;
  }

  return (
    <iframe
      title="PDF preview"
      src={instance.url}
      style={{
        height: '100%',
      }}
    />
  );
}
