# Music providers — statut réel

## ElevenLabs (Eleven Music) — RETENU, implémenté (2026-09-02)

Après recherche (voir historique de session), ElevenLabs est le seul acteur identifié avec une
**API REST publique et documentée** capable de générer une chanson complète (voix + musique) à
partir de paroles :

- Endpoint : `POST https://api.elevenlabs.io/v1/music`
- Auth : header `xi-api-key` (PAS `Authorization: Bearer` — vérifié spécifiquement, une première
  recherche generative avait donné une réponse incorrecte sur ce point).
- Modèle `music_v2`, `composition_plan` avec sections (intro/couplet/refrain/pont/outro),
  paroles fournies ligne par ligne par section.
- **Synchrone** : la requête HTTP attend la fin de la génération et renvoie l'audio directement
  (pas de webhook ni de job à interroger côté ElevenLabs). `ElevenLabsMusicProvider` gère ça en
  remplissant `MusicGenerationHandle.immediateResult` — voir `src/services/music/finalize.ts`
  pour le code partagé qui finalise la génération, que ce soit en synchrone (ElevenLabs) ou en
  asynchrone (un futur provider à job).
- Coût indicatif (sept. 2026) : ~900 crédits/minute de musique (jusqu'à -50% via l'API selon les
  dernières baisses tarifaires). Plan Starter à 6 $/mois = 30 000 crédits ≈ 11-22 chansons de
  2-4 min. À calibrer précisément une fois un compte réel créé.
- **Non testé en conditions réelles** : aucune clé `ELEVENLABS_API_KEY` n'existe encore pour
  Chante-Moi. Le code est écrit d'après la documentation officielle mais n'a pas encore généré une
  vraie chanson — smoke-test à faire dès qu'une clé est disponible.

Fichier : `elevenlabs-provider.ts`. C'est désormais le provider prioritaire dans `MusicManager`.

## Suno — non retenu, stub conservé

Suno n'a pas d'API publique officielle (confirmé par recherche, y compris courant 2026 : accès
réservé à un programme partenaire restreint, pas de clé publique). Des wrappers non officiels
existent mais violent les CGU de Suno. `suno-provider.ts` reste en place comme second choix
documenté (lève une erreur explicite tant que `SUNO_API_KEY` n'est pas défini) au cas où Suno
ouvrirait un jour un accès public — mais ElevenLabs est la voie recommandée pour l'instant.

## Autres pistes évaluées et écartées

- **Udio** : pas d'API publique connue.
- **Mubert** : API texte→musique instrumentale, mais pas de génération vocale/chant — ne
  convient pas au besoin (le produit repose sur des paroles chantées).

## Comment activer

1. Créer un compte ElevenLabs, choisir un plan (Starter suffit pour tester).
2. Récupérer la clé API et la mettre dans `ELEVENLABS_API_KEY` (`.env.local`, jamais en clair
   dans le code ni dans le chat).
3. Lancer une génération réelle via `/creer` et vérifier `src/services/music/elevenlabs-provider.ts`
   contre le résultat obtenu — en particulier les durées de section par défaut
   (`DEFAULT_SECTION_DURATION_MS`), qui sont des estimations à ajuster selon le rendu réel.
