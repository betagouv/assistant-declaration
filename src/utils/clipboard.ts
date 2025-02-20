import { compile } from 'html-to-text';

const convertHtmlToText = compile({
  preserveNewlines: true,
  selectors: [{ selector: 'table', format: 'dataTable' }],
});

export async function htmlToClipboard(html: string): Promise<void> {
  // We finally chose to not use `renderToStaticMarkup(component)` to prevent increasing the bundle
  // since it's specific backend code. Also this was not reusing the whole frontend context so we would have to pass it trough parameters.
  // So ending using a hidden element in the browser DOM to get the HTML content
  // Ref: https://github.com/facebook/react/issues/14292#issuecomment-2669479984
  const text = convertHtmlToText(html);

  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([text], { type: 'text/plain' });

  await navigator.clipboard.write([new ClipboardItem({ [htmlBlob.type]: htmlBlob, [textBlob.type]: textBlob })]);
}
