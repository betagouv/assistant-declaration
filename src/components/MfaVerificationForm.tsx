import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import React, { useState } from 'react';

interface MfaVerificationFormProps {
  onSubmit: (code: string) => Promise<void>;
  loading?: boolean;
  error?: string;
  locked?: boolean;
  lockedUntil?: number;
}

export function MfaVerificationForm({ onSubmit, loading, error, locked, lockedUntil }: MfaVerificationFormProps) {
  const [code, setCode] = useState('');

  const isValid = code.length === 6 && /^\d{6}$/.test(code);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      await onSubmit(code);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <form onSubmit={handleSubmit} className="fr-mb-4w">
      <div className="fr-mb-3w">
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="mfa-code">
            Code de vérification
          </label>
          <span className="fr-hint-text">Saisissez le code à 6 chiffres de votre application d&#39;authentification</span>
          <input
            id="mfa-code"
            className="fr-input"
            value={code}
            onChange={handleCodeChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            aria-describedby={code.length > 0 && code.length < 6 ? 'mfa-code-hint' : undefined}
          />
          {code.length > 0 && code.length < 6 && (
            <p id="mfa-code-hint" className="fr-hint-text">
              {6 - code.length} chiffre(s) restant(s)
            </p>
          )}
        </div>
      </div>

      {error && <Alert id="mfa-error" title="Erreur" description={error} severity="error" className="fr-mb-3w" />}

      {locked && (
        <Alert
          id="mfa-locked"
          title="Compte temporairement verrouillé"
          description={
            lockedUntil
              ? `Trop de tentatives. Réessayez à ${new Date(lockedUntil).toLocaleTimeString()}.`
              : 'Trop de tentatives. Réessayez plus tard.'
          }
          severity="warning"
          className="fr-mb-3w"
        />
      )}

      <Button type="submit" disabled={!isValid || loading || locked} iconId="fr-icon-checkbox-circle-line" className="fr-mb-0">
        Vérifier
      </Button>
    </form>
  );
}
