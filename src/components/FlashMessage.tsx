import { Notice } from '@codegouvfr/react-dsfr/Notice';
import Link from '@mui/material/Link';
import NextLink from 'next/link';

export interface FlashMessageProps {
  appMode?: string;
  nodeEnv?: string;
}

export function FlashMessage(props: FlashMessageProps) {
  if (props.nodeEnv === 'production') {
    return (
      <Notice
        title={
          props.appMode === 'prod' ? (
            <>Ce service vient tout juste d&apos;être lancé, merci de nous faire vos retours dans la section support</>
          ) : (
            <>
              Vous êtes actuellement sur la version de test interne. La version grand public est accessible sur{' '}
              <Link component={NextLink} href="https://assistant-declaration.beta.gouv.fr" color="inherit" underline="none">
                assistant-declaration.beta.gouv.fr
              </Link>
            </>
          )
        }
        isClosable
        style={{
          fontSize: '0.9rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
        }}
      />
    );
  }

  return null;
}
