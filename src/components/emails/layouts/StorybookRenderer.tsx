import { renderToMjml } from '@faire/mjml-react/utils/renderToMjml';
import mjml2html from 'mjml-browser';
import { PropsWithChildren } from 'react';

export async function StorybookRendererLayout(props: PropsWithChildren) {
  const content = props.children as React.ReactElement;
  const mjmlContent = renderToMjml(content);
  // mjml v5 made `mjml2html` asynchronous
  const transformResult = await mjml2html(mjmlContent);

  if (transformResult.errors) {
    for (const err of transformResult.errors) {
      throw err;
    }
  }

  return <div dangerouslySetInnerHTML={{ __html: transformResult.html }} />;
}
