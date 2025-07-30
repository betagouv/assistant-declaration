import { fr } from '@codegouvfr/react-dsfr';
import { StaticImport } from 'next/dist/shared/lib/get-img-props';
import Image from 'next/image';
import Link from 'next/link';
import React, { CSSProperties } from 'react';

interface CaptionedImageProps {
  src: string | StaticImport;
  alt: string;
  caption?: string;
  source?: string;
  style?: CSSProperties;
}

export function CaptionedImage({ src, alt, caption, source, style }: CaptionedImageProps) {
  return (
    <figure
      className={fr.cx('fr-mb-6v')}
      style={{
        textAlign: 'center',
        marginInlineStart: 0,
        marginInlineEnd: 0,
        marginBlockStart: 0,
        marginBlockEnd: 0,
      }}
    >
      <Image
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          height: 'auto',
          objectFit: 'contain',
          ...style,
        }}
      />
      {(!!caption || !!source) && (
        <figcaption
          style={{
            textAlign: 'center',
            fontSize: '0.9em',
          }}
        >
          {caption}
          {!!caption && !!source && ' '}
          {!!source && (
            <>
              (
              <Link href={source} target="_blank" rel="noopener noreferrer" style={{ fontStyle: 'italic' }}>
                source
              </Link>
              )
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}
