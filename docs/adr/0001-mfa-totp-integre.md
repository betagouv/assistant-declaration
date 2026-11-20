# ADR-0001 : MFA par TOTP intégré à l'application

- **Statut :** Proposé (à passer en « Accepté » après validation du RSSI)
- **Date :** 18/11/2026
- **Décideurs :** <à compléter>

## Contexte

Le RSSI souhaite une authentification multi-facteurs. L'application est de taille réduite (Next.js, NextAuth, tRPC, Prisma), sans fournisseur d'identité externe.

Les utilisateurs ne rentrent pas dans le périmètre de ProConnect. Déployer un IdP complet (ex. Keycloak) représenterait une charge d'exploitation disproportionnée par rapport au périmètre (à date, 30 utilisateurs actifs).

## Options étudiées

- **A. IdP externe (Keycloak ou équivalent)** : MFA, SSO, politiques et audit natifs. Coût : infrastructure à héberger, maintenir et sécuriser, migration des comptes.
- **B. TOTP (RFC 6238) intégré à l'application** : compatible avec les applications d'authentification courantes, aucune infrastructure supplémentaire. Coût : l'équipe porte la responsabilité du stockage des secrets, de l'anti-bruteforce et du processus de reset.
- **C. OTP par SMS ou e-mail** : plus simple pour l'utilisateur, mais plus faible (SIM swap, compromission de la messagerie).
- **D. WebAuthn / passkeys** : plus robuste et résistant au phishing, mais plus long à intégrer et à supporter.
- **E. ProConnect** : écarté, les utilisateurs de l'application ne sont pas éligibles (voir Contexte).

## Décision

Option B, avec la bibliothèque `otplib` en version 13 (plugins crypto `@noble/hashes` et `@scure/base`) et `qrcode` pour la génération des QR codes.

Mesures de sécurité retenues :

- Secret TOTP de 160 bits (32 caractères Base32), stocké chiffré en base (AES-256-GCM, clé hors base).
- Tolérance de ±1 fenêtre de 30 s, rejet d'un code déjà utilisé (anti-rejeu).
- Verrouillage temporaire après échecs répétés.
- Vérification MFA imposée côté serveur (API et routes), pas seulement par redirection.
- Journalisation des événements MFA (activation, désactivation, échecs, verrouillage, reset).
- Procédure de reset documentée en cas de perte du second facteur.

## Conséquences

- L'équipe est responsable de la sécurité de cette brique : revue de dépendances régulière, rotation de la clé de chiffrement.
- La clé `MFA_ENCRYPTION_KEY` est critique : en cas de perte, tous les secrets TOTP deviennent illisibles et les utilisateurs doivent se ré-enrôler. Elle doit être sauvegardée et sa rotation documentée (voir runbook).
- Pas de codes de secours en v1 : la perte du second facteur est traitée par un reset administrateur après vérification d'identité. Ce processus constitue lui-même un point d'attention (ingénierie sociale). Les codes de secours pourront être ajoutés ultérieurement.
- La logique MFA est isolée dans `src/server/services/` pour faciliter une migration vers un IdP.
- Réévaluer cette décision si : une seconde application apparaît (besoin de SSO), le nombre d'utilisateurs ou d'exigences d'audit augmente fortement, ou le RSSI exige WebAuthn / un niveau d'assurance supérieur.
- Hors périmètre : protection contre le vol de session ou le phishing en temps réel (non couverts par TOTP).

Voir aussi : [runbook MFA](../runbooks/mfa.md) *(à venir)*