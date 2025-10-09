import { fr } from '@codegouvfr/react-dsfr';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import Image, { StaticImageData } from 'next/image';

export interface WidgetProps {
  icon: StaticImageData;
  title: string;
  children: React.ReactNode;
}

export function Widget({ children, title, icon }: WidgetProps) {
  const { isDark } = useIsDark();

  return (
    <div
      className={fr.cx('fr-py-6v', 'fr-px-6v')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: fr.colors.decisions.background.alt.yellowTournesol.default,
        textAlign: 'center',
        border: 0,
      }}
    >
      <div
        className={fr.cx('fr-mx-auto')}
        style={{
          width: '60%',
          height: 150,
        }}
      >
        <Image
          src={icon}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: isDark ? 'invert(100%)' : undefined,
          }}
        />
      </div>
      <div className={fr.cx('fr-h6')}>{title}</div>
      {children}
    </div>
  );
}
