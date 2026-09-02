# Music providers — statut réel

Aucun moteur "paroles → chanson chantée" n'est branché à une vraie API en ce moment. C'est le
composant le plus critique du produit (section 13 du cahier des charges) et aussi le plus risqué
à intégrer sans vérification.

## Pourquoi rien n'est câblé

- **Suno** n'a pas d'API publique officielle documentée. Des wrappers non officiels existent
  mais leur usage viole les CGU de Suno et peut casser sans préavis. `suno-provider.ts` définit
  le contrat d'intégration mais lève une erreur explicite tant que ce n'est pas résolu.
- D'autres pistes à évaluer avant de choisir un provider définitif : Udio (pas d'API publique
  connue à ce jour), ElevenLabs Music (API disponible, à vérifier), Mubert (API texte→musique
  instrumentale, pas de chant), Riffusion, ou un partenariat direct avec un studio/label
  africain pour une génération semi-manuelle en attendant qu'une API fiable existe.

## Ce qui EST prêt

- `types.ts` : le contrat `MusicProvider` (startGeneration/checkStatus) — asynchrone, avec
  statuts réels PENDING/PROCESSING/COMPLETED/FAILED/CANCELLED, jamais de progression simulée.
- `manager.ts` : `MusicManager`, qui route vers le provider actif et gère should-be fallback ;
  le reste de l'app ne parle qu'à lui.
- La table `generation_jobs` (voir `supabase/migrations`) est prête à recevoir de vrais jobs
  dès qu'un provider réel est branché — aucune migration de schéma ne sera nécessaire.

## Avant d'activer un vrai provider

1. Lire la documentation officielle à jour (endpoints, auth, webhooks, limites, CGU commerciales).
2. Implémenter un nouveau fichier `<provider>-provider.ts` sur le modèle de `suno-provider.ts`.
3. Vérifier le format exact des webhooks/polling de statut avant de faire confiance à un
   `COMPLETED`.
4. Ajouter la clé dans `.env.example` (déjà prévu : `SUNO_API_KEY`, `MUSIC_PROVIDER_FALLBACK_API_KEY`).
5. Enregistrer le provider dans `manager.ts` et dans la table admin `provider_configs`.

Tant que ce n'est pas fait, `MusicManager.startGeneration()` renvoie une erreur explicite plutôt
qu'un faux succès — c'est le comportement voulu (section 69).
