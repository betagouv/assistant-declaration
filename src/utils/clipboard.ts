import { compile } from 'html-to-text';
import { renderToStaticMarkup } from 'react-dom/server';

const convertHtmlToText = compile({
  preserveNewlines: true,
  selectors: [{ selector: 'table', format: 'dataTable' }],
});

export async function componentToClipboard(component: JSX.Element) {
  const html = renderToStaticMarkup(component);
  const text = convertHtmlToText(html);

  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([text], { type: 'text/plain' });

  await navigator.clipboard.write([new ClipboardItem({ [htmlBlob.type]: htmlBlob, [textBlob.type]: textBlob })]);
}
