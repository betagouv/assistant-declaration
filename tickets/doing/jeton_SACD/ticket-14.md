# Ticket #14 : Migration en masse - Mise à jour des identifiants SACD

**Type :** Backend/Ops
**Priorité :** Haute
**Estimation :** 2h

## Description
Créer un script de migration pour mettre à jour les identifiants SACD existants (129 déclarants) à partir du fichier de correspondance fourni par la SACD (ancien ID 6 chiffres → nouvel ID 32 hex).

## Tâches
- [x] Écrire les tests du script de migration
- [x] Créer un script Node.js qui :
  - Lit le fichier de correspondance CSV/JSON fourni par la SACD
  - Pour chaque paire ancien→nouvel ID, met à jour la base de données
  - Log les mises à jour effectuées
  - Gère les erreurs (ID inexistant, doublon, etc.)
- [x] Exécuter la migration en environnement de staging
- [x] Vérifier les résultats

## Critères d'acceptation
- [x] Le script lit correctement le fichier de correspondance
- [x] Le script met à jour tous les identifiants valides
- [x] Le script log les erreurs et les identifiants non mis à jour
- [x] Les tests de migration passent
- [x] La migration a été testée sur staging avec succès

## Fichiers impactés
- `scripts/migrate-sacd-ids.js` (à créer)
- Tests associés