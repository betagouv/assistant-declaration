import { fr } from '@codegouvfr/react-dsfr';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

export const overridenComponents: MDXComponents = {
  a: (props) => {
    const isExternal = props.href && (props.href?.startsWith('http') || props.href?.startsWith('//'));

    return <Link {...props} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />;
  },
  table: (props) => {
    return (
      <div className="fr-table">
        <table>{props.children}</table>
      </div>
    );
  },
  blockquote: (props) => {
    // We cannot use <CallOut /> from `react-dsfr` because it uses a <p> instead, and it's forbidden to have nested paragraphs
    // We did try to modify top children to remove any <p> but it was breaking the format, the easier is to use raw DSFR here to not have a <p> wrapper
    return (
      <div className={fr.cx('fr-callout')}>
        <div className={fr.cx('fr-callout__text')}>{props.children}</div>
      </div>
    );
  },
};
