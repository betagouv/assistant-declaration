'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { trpc } from '@ad/src/client/trpcClient';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { useSession } from '@ad/src/proxies/next-auth/react';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function MfaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionWrapper = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const setupMutation = trpc.setupMfaSecret.useMutation({
    onError: (err) => {
      setError(err.message);
    },
  });

  const verifyLoginMutation = trpc.verifyMfaLogin.useMutation({
    onSuccess: async () => {
      const callbackUrl = searchParams?.get('callbackUrl') || linkRegistry.get('dashboard', undefined);
      router.push(callbackUrl);
    },
    onError: (err) => {
      const match = err.message.match(/(\d+) tentatives restantes/i);
      if (match) {
        setRemainingAttempts(parseInt(match[1]));
        setError('Code de vérification invalide');
      } else {
        setError(err.message);
      }
    },
  });

  const verifySetupMutation = trpc.verifyMfaSetup.useMutation({
    onSuccess: async () => {
      // Setup successful, redirect to dashboard
      router.push(linkRegistry.get('dashboard', undefined));
    },
    onError: (err) => {
      const match = err.message.match(/(\d+) tentatives restantes/i);
      if (match) {
        setRemainingAttempts(parseInt(match[1]));
        setError('Code de vérification invalide');
      } else {
        setError(err.message);
      }
    },
  });

  const handleSetup = async () => {
    try {
      setError(null);
      await setupMutation.mutateAsync();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la configuration du MFA';
      setError(message);
    }
  };

  useEffect(() => {
    // Pre-fill error from query params
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  if (sessionWrapper.status !== 'authenticated') {
    return <LoadingArea ariaLabelTarget="contenu" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (sessionWrapper.data?.user.mfaEnabled) {
      verifyLoginMutation.mutate({ code });
    } else {
      verifySetupMutation.mutate({ code });
    }
  };

  const codeInput = (
    <Input
      id="code"
      label="Code à 6 chiffres"
      aria-describedby="code-hint"
      nativeInputProps={{
        value: code,
        maxLength: 6,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value),
      }}
    />
  );

  if (!sessionWrapper.data?.user.mfaEnabled) {
    // Auto-trigger setup if not yet enabled
    if (!setupMutation.data && !setupMutation.isPending) {
      handleSetup();
    }

    return (
      <div className={fr.cx('fr-container', 'fr-my-4w')}>
        <div className={fr.cx('fr-card')}>
          <div className={fr.cx('fr-card__body')}>
            <div className={fr.cx('fr-card__content')}>
              <div>
                <h1 className={fr.cx('fr-card__title', 'fr-mb-2w')}>Activer l&apos;authentification à deux facteurs</h1>
              </div>
              <div>
                <p className={fr.cx('fr-text--lead', 'fr-mb-4w')}>
                  Pour des raisons de sécurité, vous devez activer l&apos;authentification à deux facteurs avant de continuer. Utilisez une
                  application comme Google Authenticator ou Authy.
                </p>
              </div>

              {setupMutation.isPending && !setupMutation.data ? (
                <LoadingArea ariaLabelTarget="configuration du MFA" />
              ) : setupMutation.data ? (
                <div>
                  <p className={fr.cx('fr-text--sm', 'fr-mb-2w')}>
                    Scannez le QR code ci-dessous avec votre application d&apos;authentification, puis saisissez le code à 6 chiffres généré.
                  </p>
                  <img
                    src={setupMutation.data.qrCode}
                    alt="QR code pour la configuration du MFA"
                    className={fr.cx('fr-mb-2w')}
                    style={{ maxWidth: '256px' }}
                  />

                  {error && <Alert severity="error" description={error} small className={fr.cx('fr-mb-2w')} />}
                  {remainingAttempts !== null && (
                    <div className={fr.cx('fr-text--sm', 'fr-mb-2w')}>
                      <Badge severity="warning">
                        {remainingAttempts} tentative{remainingAttempts !== 1 ? 's' : ''} restante{remainingAttempts !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                  <form onSubmit={handleSubmit}>
                    {codeInput}
                    <Button type="submit" disabled={code.length !== 6}>
                      Vérifier et activer
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionWrapper.data?.user.mfaVerified) {
    return (
      <div className={fr.cx('fr-container', 'fr-my-4w')}>
        <div className={fr.cx('fr-card')}>
          <div className={fr.cx('fr-card__body')}>
            <div className={fr.cx('fr-card__content')}>
              <div>
                <h1 className={fr.cx('fr-card__title', 'fr-mb-2w')}>
                  Vérification en deux étapes
                  <Badge severity="info" className={fr.cx('fr-ml-2w')}>
                    En cours
                  </Badge>
                </h1>
              </div>
              <div>
                <p className={fr.cx('fr-text--lead', 'fr-mb-4w')}>
                  Saisissez le code à 6 chiffres généré par votre application d&apos;authentification.
                </p>
              </div>

              {error && <Alert severity="error" description={error} small className={fr.cx('fr-mb-2w')} />}
              {remainingAttempts !== null && (
                <div className={fr.cx('fr-text--sm', 'fr-mb-2w')}>
                  <Badge severity="warning">
                    {remainingAttempts} tentative{remainingAttempts !== 1 ? 's' : ''} restante{remainingAttempts !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                {codeInput}
                <Button type="submit" disabled={code.length !== 6}>
                  Vérifier
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
