# Smart Commit

Effectue un commit intelligent avec validation préalable.

## Instructions

1. **Lancer le lint** avec `npm run lint`
2. **Lancer les tests** avec `npm run test`
3. **Si lint ou tests échouent**, arrête-toi et explique les erreurs
4. **Si tout passe**, analyse les changements avec `git diff --staged` et `git diff`
5. **Stage tous les fichiers modifiés** pertinents (ignore les fichiers sensibles comme .env)
6. **Génère un message de commit concis** en français qui:
   - Commence par un verbe à l'infinitif (Ajouter, Corriger, Modifier, Refactorer...)
   - Résume les changements en 1-2 lignes max
   - Se concentre sur le "pourquoi" plutôt que le "quoi"
7. **Crée le commit** avec le message généré
8. **Push** vers le remote

## Format du message

```
[Type] Description concise

Details si nécessaire (max 1-2 lignes)
```

Types: feat, fix, refactor, docs, test, chore

## Exemple

```
feat: Ajouter la vérification premium avant recherche IA

Attendre le chargement du profil pour éviter les faux positifs de limite
```
