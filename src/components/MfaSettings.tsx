'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { useState } from 'react';

export interface MfaSettingsProps {
  mfaEnabled: boolean;
  onSetup?: () => Promise<{ qrCode: string }>;
  onVerify?: (code: string) => Promise<void>;
  onDisable?: (code: string) => Promise<void>;
  onEnabled?: () => void;
  onDisabled?: () => void;
}

export function MfaSettings({ mfaEnabled, onSetup, onVerify, onDisable, onEnabled, onDisabled }: MfaSettingsProps) {
  const [setupComplete, setSetupComplete] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    try {
      setError(null);
      if (onSetup) {
        const result = await onSetup();
        setQrCode(result.qrCode);
      }
      setSetupComplete(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la configuration du MFA';
      setError(message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setVerifyingCode(true);
      if (onVerify) {
        await onVerify(code);
      }
      setQrCode(null);
      setCode('');
      setSetupComplete(false);
      onEnabled?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Code de vérification invalide';
      setError(message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setDeactivating(true);
      if (onDisable) {
        await onDisable(code);
      }
      setCode('');
      onDisabled?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Code TOTP invalide';
      setError(message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  if (mfaEnabled) {
    return (
      <div className={fr.cx('fr-p-4w')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-6')}>
            <Alert title="MFA activé" severity="success" description="L'authentification à deux facteurs est activée sur votre compte." />

            {error && <Alert title="Erreur" severity="error" description={error} className={fr.cx('fr-mt-4w')} />}

            <Button onClick={() => setDeactivating(true)} disabled={deactivating} className={fr.cx('fr-mt-4w')}>
              Désactiver le MFA
            </Button>

            {deactivating && (
              <form onSubmit={handleDeactivate} className={fr.cx('fr-mt-4w')}>
                <p className={fr.cx('fr-text--sm', 'fr-mb-2w')}>
                  Saisissez le code à 6 chiffres de votre application d&#39;authentification pour confirmer la désactivation.
                </p>

                <div className={fr.cx('fr-mb-4w')}>
                  <Input
                    label="Code à 6 chiffres"
                    state={!!error ? 'error' : undefined}
                    stateRelatedMessage={error}
                    nativeInputProps={{
                      type: 'text',
                      value: code,
                      onChange: handleCodeChange,
                      maxLength: 6,
                      required: true,
                      pattern: '\\d{6}',
                      'aria-required': 'true',
                    }}
                  />
                </div>

                <Button type="submit" disabled={code.length !== 6}>
                  Désactiver
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <div className={fr.cx('fr-p-4w')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-6')}>
            <div className={fr.cx('fr-card', 'fr-card--horizontal')}>
              <div className={fr.cx('fr-card__body')}>
                <div className={fr.cx('fr-card__content')}>
                  <h3 className={fr.cx('fr-card__title', 'fr-h4')}>
                    Authentification à deux facteurs
                    <Badge severity="warning" className={fr.cx('fr-ml-2w')}>
                      Non activé
                    </Badge>
                  </h3>
                  <p className={fr.cx('fr-card__desc', 'fr-mb-4w')}>
                    Activez l&#39;authentification à deux facteurs pour sécuriser votre compte avec une application comme Google Authenticator ou
                    Authy.
                  </p>
                  {error && <Alert title="Erreur" severity="error" description={error} className={fr.cx('fr-mb-4w')} />}
                  <Button onClick={handleSetup}>Activer le MFA</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={fr.cx('fr-p-4w')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-8', 'fr-col-lg-6')}>
          <div className={fr.cx('fr-card', 'fr-card--horizontal')}>
            <div className={fr.cx('fr-card__body')}>
              <div className={fr.cx('fr-card__content')}>
                <h3 className={fr.cx('fr-card__title', 'fr-h4')}>Configurer le MFA</h3>
                <p className={fr.cx('fr-card__desc', 'fr-mb-4w')}>
                  Scannez le QR code ci-dessous avec votre application d&#39;authentification, puis saisissez le code à 6 chiffres généré.
                </p>

                {error && <Alert title="Erreur" severity="error" description={error} className={fr.cx('fr-mb-4w')} />}

                <div className={fr.cx('fr-mb-4w')}>
                  <img src={qrCode || ''} alt="QR code pour la configuration du MFA" className={fr.cx('fr-mb-2w')} style={{ maxWidth: '256px' }} />
                </div>

                <form onSubmit={handleVerify}>
                  <div className={fr.cx('fr-mb-4w')}>
                    <Input
                      label="Code à 6 chiffres"
                      state={!!error ? 'error' : undefined}
                      stateRelatedMessage={error}
                      nativeInputProps={{
                        type: 'text',
                        value: code,
                        onChange: handleCodeChange,
                        maxLength: 6,
                        required: true,
                        pattern: '\\d{6}',
                        'aria-required': 'true',
                      }}
                    />
                  </div>

                  <Button type="submit" disabled={code.length !== 6}>
                    Vérifier et activer
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
