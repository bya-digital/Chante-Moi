# MeloKado

Tu racontes. Nous chantons.

Plateforme de création musicale personnalisée par IA pour l'Afrique francophone. Voir
[ARCHITECTURE.md](./ARCHITECTURE.md) pour le détail technique et l'état d'avancement réel.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # renseigner au minimum OPENAI_API_KEY pour tester les paroles
npm run dev -- -p 3004
```

Sans `.env.local` renseigné, l'app tourne quand même : la landing page et le tunnel de
création (`/creer`) utilisent des données de repli (voir `src/lib/data/reference.ts`), et
chaque étape qui dépend d'un provider externe échoue proprement avec un message explicite
plutôt que de simuler un succès.

## Scripts

- `npm run dev` — serveur de développement (Turbopack)
- `npm run build` — build de production
- `npm run lint` — ESLint

## Base de données

Le schéma complet est dans `supabase/migrations/0001_base_schema.sql` — à coller dans le SQL
Editor d'un nouveau projet Supabase (aucun projet n'est encore connecté).
