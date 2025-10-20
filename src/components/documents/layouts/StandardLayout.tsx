import { Document } from '@react-pdf/renderer';
import { PropsWithChildren } from 'react';

export interface StandardLayoutProps {
  title: string;
}

export function StandardLayout(props: PropsWithChildren<StandardLayoutProps>) {
  return (
    <Document language="fr-FR" title={props.title} creator="assistant-declaration" producer="assistant-declaration">
      {props.children}
    </Document>
  );
}
