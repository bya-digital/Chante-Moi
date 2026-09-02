# MeloKado — Architecture technique

## Positionnement
"Tu racontes. Nous chantons." — plateforme de création musicale personnalisée par IA pour
l'Afrique francophone (priorité Côte d'Ivoire). Une histoire → une émotion → une chanson → un
cadeau → un souvenir partageable. Pas un générateur de musique générique : un produit-cadeau
émotionnel, mobile-first.

## Stack technique

| Couche | Choix | Raison |
|---|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) + TypeScript | Cohérent avec les autres projets (SikaZik, BYA-Flow), RSC pour perf |
| UI | Tailwind CSS v4 + shadcn/ui (style radix-nova) | Design system premium, accessible par défaut |
| Backend | Supabase (Postgres + Auth + Storage) | RLS natif, pas de serveur à gérer |
| IA texte | Abstraction `AIProvider` (OpenAI principal, Anthropic fallback) | Aucun composant métier ne parle à un SDK IA directement |
| Voix → texte | Abstraction `SpeechProvider` (OpenAI Whisper, Deepgram) | Mode vocal sans dépendre d'un seul fournisseur |
| Texte → chanson | Abstraction `MusicProvider` — **aucun provider vérifié en prod actuellement**, voir `src/services/music/README.md` |
| Paiement | `PaymentManager` + `PaymentRouter` (CinetPay, Stripe, Paystack, Flutterwave implémentés ; PayDunya/Kkiapay/IkePay/PayPal en stub) |
| Stockage | Supabase Storage (buckets `audio`, `video`, `covers`, `user-uploads`, `voice-recordings`) |
| Notifications | Resend (email), WhatsApp Cloud API (stub tant que le numéro pro n'est pas vérifié) |

## Principe multi-provider (section 5 du cahier des charges)
Aucune page ni composant métier n'importe un SDK provider directement. Tout passe par un
`Manager` (`AIManager`, `SpeechManager`, `MusicManager`, `PaymentManager`, `StorageManager`,
`NotificationManager`) qui route vers le premier provider configuré/actif, avec fallback. Le
kill switch admin (table `provider_configs`) coupera un provider sans toucher au code — pas
encore branché sur une UI admin (à faire), mais le contrat `ProviderStatusChecker` existe déjà
dans `src/services/ai/manager.ts` et est réutilisé partout.

## Principe de sécurité des paiements
```
Frontend → /api/orders → /api/payments/create → PaymentRouter → Provider
    → Webhook (/api/payments/webhook/[provider], idempotent par provider_reference)
    → orders.status = 'paid' + credit_transactions
```
Un paiement n'est jamais confirmé sur la seule foi du frontend : `parseWebhook()` de chaque
provider revérifie activement le statut, et le webhook est no-op si `payment_attempts.status`
est déjà `SUCCESS` (idempotence).

## Ce qui est RÉELLEMENT prêt (2026-09-02)
- Schéma Postgres complet (`supabase/migrations/0001_base_schema.sql`) avec RLS sur toutes les
  tables utilisateur, seed des référentiels (occasions, émotions, styles, voix, pays, devises,
  provider_configs, pricing).
- Auth Supabase (email/mot de passe) — `/connexion`, `/inscription`.
- Landing page complète (`/`).
- Tunnel de création complet (`/creer`) : 8 étapes, mode texte + mode vocal (MediaRecorder),
  génération de paroles IA, choix style/voix/émotion, sélection de formule, création de
  commande + intent de paiement.
- Routes API : `/api/lyrics/generate`, `/api/lyrics/rewrite`, `/api/story/transcribe`,
  `/api/orders`, `/api/payments/create`, `/api/payments/webhook/[provider]`,
  `/api/generations`, `/api/generations/[id]`.
- Providers IA texte (OpenAI, Anthropic) et speech-to-text (OpenAI Whisper, Deepgram) — appels
  réels, fonctionnels dès qu'une clé API est renseignée.
- Providers paiement CinetPay/Stripe/Paystack/Flutterwave — implémentés d'après doc connue,
  **à smoke-tester en sandbox avant toute mise en production** (aucune clé réelle n'existe
  encore). PayDunya/Kkiapay/IkePay/PayPal en stub explicite.

## Ce qui N'EST PAS prêt (volontairement, jamais simulé)
- **Aucun moteur musical texte→chanson n'est branché** — voir `src/services/music/README.md`.
  C'est le risque n°1 du produit : aucune API "paroles → chanson chantée" fiable et publique
  n'a été identifiée à ce jour (Suno n'a pas d'API officielle). Le tunnel de création dégrade
  proprement (message d'erreur explicite) plutôt que de fabriquer un faux succès.
- Page résultat, page cadeau (`/gift/[slug]`), historique (`/mes-creations`), admin, vidéo.
- Aucun compte Supabase/clé API réel n'est encore configuré pour MeloKado — tout tourne en
  local avec des données de repli (`src/lib/data/reference.ts`) tant que `.env.local` est vide.

## Conventions
UUID partout, `timestamptz` partout, RLS activé sur toutes les tables dès la création. Policies
RLS écrites pour éviter les deux pièges déjà rencontrés sur eglise-app : pas de cycle
policy-table-A ↔ policy-table-B, et `is_admin()` en `security definer` pour éviter qu'une
policy sur une autre table RLS-protégée échoue silencieusement pour un appelant non-admin.
