# Runbook MFA

## 1. Réinitialisation MFA d'un utilisateur (perte du second facteur)

**Quand :** l'utilisateur a perdu son second facteur (téléphone, app d'authentification). La MFA est désactivée, il devra se ré-enrôler.

**Prérequis :**

- Vérification d'identité de l'utilisateur (appel téléphonique, email de confirmation, etc.)
- Accès à la base de données de production
- Accès au terminal avec les variables d'environnement de production

**Procédure :**

```bash
# Exécuter le script de réinitialisation (désactive la MFA)
npx tsx scripts/reset-mfa.js <email_utilisateur>
```

**Vérification :**

- L'utilisateur doit pouvoir se connecter sans code MFA
- L'action est journalisée dans `logs/reset-mfa.log` (admin, email, timestamp, modifications)

## 2. Déblocage d'un compte verrouillé (trop d'échecs)

**Quand :** le compte est verrouillé après 5 échecs consécutifs, mais l'utilisateur a toujours son second facteur.

**Symptômes :**

- L'utilisateur voit "Compte verrouillé" ou "Trop de tentatives"
- Le compte est verrouillé après 5 échecs consécutifs

**Procédure :**

- **Méthode 1 :** Attendre 15 minutes (verrouillage automatique expiré)
- **Méthode 2 :** Utiliser le script de réinitialisation MFA en mode `--unlock` (remet uniquement les compteurs à zéro, sans désactiver la MFA) :
  ```bash
  npx tsx scripts/reset-mfa.js --unlock <email_utilisateur>
  ```

**Vérification :**

- L'utilisateur peut se connecter avec son code MFA habituel
- L'action est journalisée dans `logs/reset-mfa.log`

## 3. Rotation de MFA_ENCRYPTION_KEY

**Prérequis :**

- Planification d'une fenêtre de maintenance
- Notification aux utilisateurs
- Sauvegarde de la base de données

**Procédure :**

1. **Préparer la nouvelle clé :**

   ```bash
   openssl rand -base64 32 > new_mfa_key.txt
   ```

2. **Déployer avec la nouvelle clé :**

   ```bash
   export MFA_ENCRYPTION_KEY=$(cat new_mfa_key.txt)
   # Déployer l'application
   ```

3. **Migrer les secrets existants :**
   - Chiffrer les secrets TOTP avec la nouvelle clé
   - Désactiver la clé ancienne
   - **Sans migration, tous les utilisateurs doivent se ré-enrôler** (perdre leur secret TOTP)

4. **Vérifier :**
   - Tester l'authentification MFA avec un compte test
   - Vérifier les logs d'erreurs

## 4. Mise à jour d'otplib

**Procédure :**

1. **Vérifier la version actuelle :**

   ```bash
   npm list otplib
   ```

2. **Mettre à jour :**

   ```bash
   npm install otplib@latest
   ```

3. **Tests :**
   - Exécuter la suite de tests unitaires
   - Tester l'authentification MFA en environnement de staging
   - Vérifier la compatibilité avec les applications d'authentification courantes

4. **Déploiement :**
   - Déployer en production
   - Surveiller les logs d'erreurs

## 5. Procédures de vérification d'identité

**Pour toute opération sensible (reset MFA, déblocage) :**

- **Coordination avec le support :** Les demandes doivent venir uniquement d'un membre de l'équipe qui s'est assuré préalablement de l'identité de l'utilisateur.

## 6. Contacts

- **Support technique :** <à compléter>
- **RSSI :** <à compléter>
- **Équipe développement :** <à compléter>

## 7. Timeout de vérification MFA

**Comportement :** Même après une vérification MFA réussie, la session est limitée à **180 minutes** (3 heures) par défaut. Après ce délai, l'utilisateur doit à nouveau saisir un code TOTP.

**Variable d'environnement :** `MFA_VERIFICATION_TIMEOUT_MINUTES`

**Environnement de développement :** La valeur peut être réduite pour faciliter les tests (ex. `MFA_VERIFICATION_TIMEOUT_MINUTES=5`).

**Déconnexion :** À la déconnexion, `mfaLastVerifiedAt` est réinitialisé à `null`. L'utilisateur devra saisir un code TOTP à sa prochaine connexion.

## 8. Tolérance d'horloge TOTP et tests unitaires

**Tolérance d'horloge :** La vérification TOTP (`verifyTotp` dans `src/server/services/totp.ts`) utilise `authenticator.check(code, secret)` avec `window: 0` : seul le créneau de 30 s courant est accepté. Un utilisateur dont l'horloge du téléphone dérive de plus de ~15 s verra son code rejeté.

- Si des rejets liés à la dérive d'horloge sont constatés en production, réintroduire la tolérance ±1 créneau en passant `window: 1` à `authenticator.check()` (comportement d'origine, documenté dans l'historique git).
- Les secrets sont en **Base32** (générés par `authenticator.generateSecret`, scannés par les apps d'authentification). Les tests qui génèrent des codes doivent utiliser `authenticator` du preset par défaut (`@otplib/preset-default`), **pas** une instance brute `TOTP` de `@otplib/core` (encodage ASCII par défaut, incompatible avec les secrets Base32).

**Tests unitaires MFA :**

```bash
npm run jest -- --testPathPatterns="mfa"
```

Couvre : `totp.spec.ts` (génération secret, URI otpauth, vérification code, QR code), `mfa-lockout.spec.ts` (verrouillage après 5 échecs, déverrouillage, réinitialisation des compteurs) et `mfa.spec.ts` (routeurs setup/vérification/désactivation MFA). Un code d'un créneau précédent/suivant doit être **rejeté** (window 0).
