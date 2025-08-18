import { PropsWithChildren } from 'react';

export function ContentWrapper(props: PropsWithChildren) {
  return (
    <main
      role="main"
      style={{
        display: 'flex',
        flex: '1 1 auto',
      }}
    >
      {props.children}
    </main>
  );
}
