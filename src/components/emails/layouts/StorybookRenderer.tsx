import { renderToMjml } from '@faire/mjml-react/utils/renderToMjml';
import mjml2html from 'mjml-browser';
import { PropsWithChildren } from 'react';

export function StorybookRendererLayout(props: PropsWithChildren) {
  const content = props.children as React.ReactElement;
  const mjmlContent = renderToMjml(content);
  const transformResult = mjml2html(mjmlContent);

  if (transformResult.errors) {
    for (const err of transformResult.errors) {
      throw err;
    }
  }

  return <div dangerouslySetInnerHTML={{ __html: transformResult.html }} />;
}
