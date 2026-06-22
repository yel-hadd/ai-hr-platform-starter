# Phase 6 — Tests & qualité

## Stratégie de test

```bash
npm test          # vitest run
```

| Fichier | Type | Ce qui est vérifié |
|---|---|---|
| `tests/rbac.test.ts` | Unitaire (pur, sans I/O) | Imbrication stricte des rôles (Employé ⊂ Manager ⊂ Admin RH ⊂ Super Admin), capacités par rôle |
| `tests/tools.integration.test.ts` | Intégration | Les outils IA, exécutés contre une base PostgreSQL seedée, respectent le scoping par rôle (un employé voit 1 personne, un manager 4, l'admin RH 6), la rédaction du salaire, et les **refus** (employé bloqué sur la fiche de paie ou les approbations d'autrui) |
| `tests/openrouter.live.test.ts` | Live (LLM réel) | Un vrai appel OpenRouter prouve que la génération **et** l'appel d'outils fonctionnent ; auto-skip si `OPENROUTER_API_KEY` n'est pas définie |

Le build (`npm run build`) type-check l'ensemble du projet — c'est une vérification de
non-régression supplémentaire avant toute mise en production.

## Critères de qualité

- **Aucune autorisation côté client** : tout test de permission doit s'exécuter contre le serveur
  (session réelle ou simulée), jamais contre une condition d'affichage seule.
- **Échec fermé par défaut** : un test doit exister pour chaque permission sensible démontrant que
  son absence bloque l'action *avant* tout accès base de données.
- **Pas de régression de scoping** : tout ajout de champ sensible (ex : futur champ RH) doit
  s'accompagner d'un test de rédaction, à l'image du salaire.

## Limites connues (assumées, starter pédagogique)

- Les comptes de démo partagent un mot de passe (`password123`).
- `AUTH_SECRET` est livré avec une valeur de démonstration dans `.env.example`.
- Le `Dockerfile` est orienté développement (pas de build multi-stage de production).

> Ces points sont volontairement documentés ici pour ne pas être confondus avec des manquements de
> sécurité non identifiés : ils doivent être corrigés avant tout déploiement réel (cf.
> [Phase 7 — Déploiement](../07-deploiement/deploiement.md)).
