-- MeloKado — schéma de base (Phase 1 MVP)
-- À coller dans Supabase SQL Editor sur un nouveau projet.
-- Convention: UUID pk (gen_random_uuid()), timestamptz partout, RLS activé sur toutes les
-- tables contenant des données utilisateur.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Fonctions utilitaires (security definer, pour éviter les
--    cycles RLS table A <-> table B et les policies qui échouent
--    silencieusement pour un appelant sans droit de lecture sur
--    la table référencée)
-- =========================================================

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_users a where a.id = uid);
$$;

drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read" on public.admin_users
  for select using (id = auth.uid() or public.is_admin(auth.uid()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 2. Référentiels (configurables admin — sections 9/10/11/12/46/47)
-- =========================================================

create table if not exists public.countries (
  code text primary key,             -- ISO-3166 alpha-2, ex 'CI'
  name text not null,
  default_currency_code text not null,
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.currencies (
  code text primary key,             -- ex 'XOF'
  symbol text not null,
  name text not null
);

create table if not exists public.occasions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.emotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.music_styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  prompt_hint text,
  preferred_provider_id text,
  cost_estimate_xof numeric(10,2) not null default 0,
  available_country_codes text[] not null default '{}',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.voices (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  gender text not null check (gender in ('masculine', 'feminine')),
  category text not null check (category in ('douce', 'emotionnelle', 'puissante', 'chaleureuse', 'profonde', 'energique')),
  active boolean not null default true,
  sort_order int not null default 0
);

-- Providers multi-fournisseurs pilotables depuis l'admin (kill switch, priorité — sections 19/38)
create table if not exists public.provider_configs (
  id text primary key,               -- ex 'openai', 'cinetpay'
  provider_type text not null check (provider_type in ('ai', 'speech', 'music', 'payment', 'storage', 'notification', 'video')),
  display_name text not null,
  active boolean not null default true,
  priority int not null default 100,
  country_codes text[] not null default '{}',
  error_count int not null default 0,
  last_error text,
  last_error_at timestamptz,
  request_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.countries enable row level security;
alter table public.currencies enable row level security;
alter table public.occasions enable row level security;
alter table public.emotions enable row level security;
alter table public.music_styles enable row level security;
alter table public.voices enable row level security;
alter table public.provider_configs enable row level security;

drop policy if exists "reference_public_read" on public.countries;
create policy "reference_public_read" on public.countries for select using (true);
drop policy if exists "reference_public_read" on public.currencies;
create policy "reference_public_read" on public.currencies for select using (true);
drop policy if exists "reference_public_read" on public.occasions;
create policy "reference_public_read" on public.occasions for select using (active or public.is_admin(auth.uid()));
drop policy if exists "reference_public_read" on public.emotions;
create policy "reference_public_read" on public.emotions for select using (active or public.is_admin(auth.uid()));
drop policy if exists "reference_public_read" on public.music_styles;
create policy "reference_public_read" on public.music_styles for select using (active or public.is_admin(auth.uid()));
drop policy if exists "reference_public_read" on public.voices;
create policy "reference_public_read" on public.voices for select using (active or public.is_admin(auth.uid()));
drop policy if exists "provider_configs_admin_only" on public.provider_configs;
create policy "provider_configs_admin_only" on public.provider_configs for select using (public.is_admin(auth.uid()));

drop policy if exists "reference_admin_write" on public.countries;
create policy "reference_admin_write" on public.countries for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "reference_admin_write" on public.currencies;
create policy "reference_admin_write" on public.currencies for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "reference_admin_write" on public.occasions;
create policy "reference_admin_write" on public.occasions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "reference_admin_write" on public.emotions;
create policy "reference_admin_write" on public.emotions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "reference_admin_write" on public.music_styles;
create policy "reference_admin_write" on public.music_styles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "reference_admin_write" on public.voices;
create policy "reference_admin_write" on public.voices for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "provider_configs_admin_write" on public.provider_configs;
create policy "provider_configs_admin_write" on public.provider_configs for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =========================================================
-- 3. Profils utilisateurs
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  country_code text references public.countries(code),
  preferred_language text not null default 'fr',
  referral_code text unique,
  referred_by_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles for select using (id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "profiles_self_write" on public.profiles;
create policy "profiles_self_write" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles for insert with check (id = auth.uid());

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- 4. Commandes / paiements / crédits (sections 14-17-58)
-- =========================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion_id uuid references public.occasions(id),
  recipient_name text,
  tier text not null default 'basic' check (tier in ('basic', 'premium', 'vip')),
  status text not null default 'draft' check (status in ('draft', 'awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  amount_xof numeric(10,2) not null,
  currency text not null default 'XOF',
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;
drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read" on public.orders for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "orders_owner_write" on public.orders;
create policy "orders_owner_write" on public.orders for insert with check (user_id = auth.uid());
drop policy if exists "orders_owner_update" on public.orders;
create policy "orders_owner_update" on public.orders for update using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_id text not null references public.provider_configs(id),
  provider_reference text,
  status text not null default 'INITIATED' check (status in ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED')),
  amount_xof numeric(10,2) not null,
  currency text not null default 'XOF',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, provider_reference)
);

alter table public.payment_attempts enable row level security;
drop policy if exists "payment_attempts_owner_read" on public.payment_attempts;
create policy "payment_attempts_owner_read" on public.payment_attempts for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid()))));
drop trigger if exists payment_attempts_set_updated_at on public.payment_attempts;
create trigger payment_attempts_set_updated_at before update on public.payment_attempts
  for each row execute function public.set_updated_at();

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('purchase', 'consumption', 'refund', 'gift', 'expiration')),
  amount int not null,                 -- positif = crédité, négatif = débité
  order_id uuid references public.orders(id),
  song_id uuid,                        -- FK ajoutée après création de songs (voir plus bas)
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.credit_transactions enable row level security;
drop policy if exists "credit_tx_owner_read" on public.credit_transactions;
create policy "credit_tx_owner_read" on public.credit_transactions for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- =========================================================
-- 5. Chansons / paroles / génération (sections 8-13-52-58)
-- =========================================================

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id),
  occasion_id uuid references public.occasions(id),
  emotion_id uuid references public.emotions(id),
  music_style_id uuid references public.music_styles(id),
  voice_id uuid references public.voices(id),
  title text,
  recipient_name text,
  story_raw text,                      -- histoire fournie par l'utilisateur (texte ou transcription nettoyée)
  status text not null default 'draft' check (status in ('draft', 'lyrics_ready', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  audio_url text,
  cover_url text,
  duration_seconds int,
  is_favorite boolean not null default false,
  language text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.songs enable row level security;
drop policy if exists "songs_owner_read" on public.songs;
create policy "songs_owner_read" on public.songs for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "songs_owner_write" on public.songs;
create policy "songs_owner_write" on public.songs for insert with check (user_id = auth.uid());
drop policy if exists "songs_owner_update" on public.songs;
create policy "songs_owner_update" on public.songs for update using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at before update on public.songs
  for each row execute function public.set_updated_at();

alter table public.credit_transactions
  drop constraint if exists credit_transactions_song_fk;
alter table public.credit_transactions
  add constraint credit_transactions_song_fk foreign key (song_id) references public.songs(id);

create table if not exists public.lyrics (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  version int not null default 1,
  title text not null,
  full_text text not null,
  sections jsonb not null default '[]',
  language text not null default 'fr',
  created_by text not null default 'ai' check (created_by in ('ai', 'user')),
  created_at timestamptz not null default now()
);

alter table public.lyrics enable row level security;
drop policy if exists "lyrics_owner_read" on public.lyrics;
create policy "lyrics_owner_read" on public.lyrics for select
  using (exists (select 1 from public.songs s where s.id = song_id and (s.user_id = auth.uid() or public.is_admin(auth.uid()))));

create table if not exists public.song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  version_number int not null default 1,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table public.song_versions enable row level security;
drop policy if exists "song_versions_owner_read" on public.song_versions;
create policy "song_versions_owner_read" on public.song_versions for select
  using (exists (select 1 from public.songs s where s.id = song_id and (s.user_id = auth.uid() or public.is_admin(auth.uid()))));

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  type text not null check (type in ('lyrics', 'music', 'video')),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  provider_id text references public.provider_configs(id),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;
drop policy if exists "generations_owner_read" on public.generations;
create policy "generations_owner_read" on public.generations for select
  using (exists (select 1 from public.songs s where s.id = song_id and (s.user_id = auth.uid() or public.is_admin(auth.uid()))));

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  provider_job_id text,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generation_jobs enable row level security;
drop policy if exists "generation_jobs_owner_read" on public.generation_jobs;
create policy "generation_jobs_owner_read" on public.generation_jobs for select
  using (exists (
    select 1 from public.generations g join public.songs s on s.id = g.song_id
    where g.id = generation_id and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  ));
drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at before update on public.generation_jobs
  for each row execute function public.set_updated_at();

create table if not exists public.generation_costs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('transcription', 'ai_text', 'music', 'video', 'storage', 'payment_fees')),
  provider_id text,
  amount_xof numeric(10,2) not null,
  user_id uuid references auth.users(id),
  order_id uuid references public.orders(id),
  generation_id uuid references public.generations(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.generation_costs enable row level security;
drop policy if exists "generation_costs_admin_only" on public.generation_costs;
create policy "generation_costs_admin_only" on public.generation_costs for select using (public.is_admin(auth.uid()));

-- =========================================================
-- 6. Cadeau / partage / favoris (sections 24-29-30-58)
-- =========================================================

create table if not exists public.gift_pages (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  slug text not null unique,
  recipient_name text,
  photo_url text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.gift_pages enable row level security;
drop policy if exists "gift_pages_public_read" on public.gift_pages;
create policy "gift_pages_public_read" on public.gift_pages for select using (true);
drop policy if exists "gift_pages_owner_write" on public.gift_pages;
create policy "gift_pages_owner_write" on public.gift_pages for insert
  with check (exists (select 1 from public.songs s where s.id = song_id and s.user_id = auth.uid()));
drop policy if exists "gift_pages_owner_update" on public.gift_pages;
create policy "gift_pages_owner_update" on public.gift_pages for update
  using (exists (select 1 from public.songs s where s.id = song_id and (s.user_id = auth.uid() or public.is_admin(auth.uid()))));

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('audio', 'video', 'covers', 'user-uploads', 'voice-recordings')),
  path text not null,
  kind text not null check (kind in ('cover', 'audio', 'photo', 'voice_message', 'voice_story')),
  created_at timestamptz not null default now()
);

alter table public.media_files enable row level security;
drop policy if exists "media_files_owner_read" on public.media_files;
create policy "media_files_owner_read" on public.media_files for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "media_files_owner_write" on public.media_files;
create policy "media_files_owner_write" on public.media_files for insert with check (user_id = auth.uid());
drop policy if exists "media_files_owner_delete" on public.media_files;
create policy "media_files_owner_delete" on public.media_files for delete using (user_id = auth.uid());

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, song_id)
);

alter table public.favorites enable row level security;
drop policy if exists "favorites_owner_all" on public.favorites;
create policy "favorites_owner_all" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- 7. Parrainage (section 33)
-- =========================================================

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.referrals enable row level security;
drop policy if exists "referrals_owner_read" on public.referrals;
create policy "referrals_owner_read" on public.referrals for select using (referrer_user_id = auth.uid() or public.is_admin(auth.uid()));

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referred_user_id uuid references auth.users(id),
  reward_type text not null default 'credit' check (reward_type in ('credit', 'cash')),
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'granted', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.referral_rewards enable row level security;
drop policy if exists "referral_rewards_owner_read" on public.referral_rewards;
create policy "referral_rewards_owner_read" on public.referral_rewards for select
  using (exists (select 1 from public.referrals r where r.id = referral_id and (r.referrer_user_id = auth.uid() or public.is_admin(auth.uid()))));

create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.referral_clicks enable row level security;
drop policy if exists "referral_clicks_admin_only" on public.referral_clicks;
create policy "referral_clicks_admin_only" on public.referral_clicks for select using (public.is_admin(auth.uid()));

-- =========================================================
-- 8. Notifications / logs / admin (sections 32-37-38-55-58)
-- =========================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  channel text not null check (channel in ('email', 'whatsapp', 'push')),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read" on public.notifications for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

create table if not exists public.provider_logs (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null,
  provider_id text not null,
  action text not null,
  success boolean not null,
  duration_ms int,
  error_message text,
  request_id text,
  user_id uuid,
  order_id uuid,
  generation_id uuid,
  created_at timestamptz not null default now()
);

alter table public.provider_logs enable row level security;
drop policy if exists "provider_logs_admin_only" on public.provider_logs;
create policy "provider_logs_admin_only" on public.provider_logs for select using (public.is_admin(auth.uid()));

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.admin_logs enable row level security;
drop policy if exists "admin_logs_admin_only" on public.admin_logs;
create policy "admin_logs_admin_only" on public.admin_logs for select using (public.is_admin(auth.uid()));

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings for select using (true);
drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write" on public.settings for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =========================================================
-- 9. Seed — référentiels de départ (sections 9-11-12-46-47-48)
-- =========================================================

insert into public.currencies (code, symbol, name) values
  ('XOF', 'FCFA', 'Franc CFA (UEMOA)'),
  ('EUR', '€', 'Euro'),
  ('USD', '$', 'Dollar américain'),
  ('GBP', '£', 'Livre sterling')
on conflict (code) do nothing;

insert into public.countries (code, name, default_currency_code, sort_order) values
  ('CI', 'Côte d''Ivoire', 'XOF', 1),
  ('BJ', 'Bénin', 'XOF', 2),
  ('TG', 'Togo', 'XOF', 3),
  ('SN', 'Sénégal', 'XOF', 4),
  ('CM', 'Cameroun', 'XOF', 5),
  ('BF', 'Burkina Faso', 'XOF', 6),
  ('ML', 'Mali', 'XOF', 7),
  ('GA', 'Gabon', 'XOF', 8),
  ('CD', 'RDC', 'USD', 9)
on conflict (code) do nothing;

insert into public.occasions (slug, name, icon, sort_order) values
  ('anniversaire', 'Anniversaire', 'cake', 1),
  ('amour', 'Déclaration d''amour', 'heart', 2),
  ('mariage', 'Mariage', 'gem', 3),
  ('naissance', 'Naissance', 'baby', 4),
  ('maman', 'Pour maman', 'flower-2', 5),
  ('papa', 'Pour papa', 'award', 6),
  ('enfant', 'Pour un enfant', 'smile', 7),
  ('hommage', 'Hommage', 'flame', 8),
  ('merci', 'Merci', 'hand-heart', 9),
  ('reussite', 'Réussite', 'trophy', 10),
  ('fete', 'Fête', 'party-popper', 11),
  ('gospel', 'Gospel', 'church', 12),
  ('priere', 'Prière', 'book-open-text', 13),
  ('demande-mariage', 'Demande en mariage', 'gem', 14),
  ('saint-valentin', 'Saint-Valentin', 'heart-handshake', 15),
  ('noel', 'Noël', 'gift', 16),
  ('nouvel-an', 'Nouvel An', 'sparkles', 17),
  ('entreprise', 'Entreprise', 'briefcase', 18),
  ('autre', 'Autre', 'music', 19)
on conflict (slug) do nothing;

insert into public.emotions (slug, name, sort_order) values
  ('emotionnel', 'Émotionnel', 1),
  ('romantique', 'Romantique', 2),
  ('joyeux', 'Joyeux', 3),
  ('festif', 'Festif', 4),
  ('humoristique', 'Humoristique', 5),
  ('solennel', 'Solennel', 6),
  ('inspirant', 'Inspirant', 7),
  ('spirituel', 'Spirituel', 8),
  ('nostalgique', 'Nostalgique', 9),
  ('energique', 'Énergique', 10)
on conflict (slug) do nothing;

insert into public.music_styles (slug, name, sort_order, available_country_codes) values
  ('afrobeat', 'Afrobeat', 1, '{}'),
  ('coupe-decale', 'Coupé-Décalé', 2, '{CI}'),
  ('zouglou', 'Zouglou', 3, '{CI}'),
  ('gospel-africain', 'Gospel africain', 4, '{}'),
  ('rumba', 'Rumba', 5, '{CD,CG}'),
  ('makossa', 'Makossa', 6, '{CM}'),
  ('mbalax', 'Mbalax', 7, '{SN}'),
  ('highlife', 'Highlife', 8, '{}'),
  ('amapiano', 'Amapiano', 9, '{}'),
  ('zouk', 'Zouk', 10, '{}'),
  ('rnb', 'R&B', 11, '{}'),
  ('pop', 'Pop', 12, '{}'),
  ('rap', 'Rap', 13, '{}'),
  ('reggae', 'Reggae', 14, '{}'),
  ('soul', 'Soul', 15, '{}'),
  ('jazz', 'Jazz', 16, '{}'),
  ('slow', 'Slow', 17, '{}'),
  ('acoustique', 'Acoustique', 18, '{}')
on conflict (slug) do nothing;

insert into public.voices (slug, name, gender, category, sort_order) values
  ('homme-chaleureux', 'Homme chaleureux', 'masculine', 'chaleureuse', 1),
  ('homme-puissant', 'Homme puissant', 'masculine', 'puissante', 2),
  ('homme-profond', 'Homme profond', 'masculine', 'profonde', 3),
  ('homme-energique', 'Homme énergique', 'masculine', 'energique', 4),
  ('femme-douce', 'Femme douce', 'feminine', 'douce', 5),
  ('femme-emotionnelle', 'Femme émotionnelle', 'feminine', 'emotionnelle', 6),
  ('femme-puissante', 'Femme puissante', 'feminine', 'puissante', 7),
  ('femme-energique', 'Femme énergique', 'feminine', 'energique', 8)
on conflict (slug) do nothing;

insert into public.provider_configs (id, provider_type, display_name, priority) values
  ('openai', 'ai', 'OpenAI (GPT)', 10),
  ('anthropic', 'ai', 'Anthropic (Claude)', 20),
  ('openai-whisper', 'speech', 'OpenAI Whisper', 10),
  ('deepgram', 'speech', 'Deepgram', 20),
  ('suno', 'music', 'Suno', 10),
  ('cinetpay', 'payment', 'CinetPay', 10),
  ('flutterwave', 'payment', 'Flutterwave', 20),
  ('paystack', 'payment', 'Paystack', 30),
  ('stripe', 'payment', 'Stripe', 40),
  ('paydunya', 'payment', 'PayDunya', 50),
  ('kkiapay', 'payment', 'Kkiapay', 60),
  ('ikepay', 'payment', 'IkePay', 70),
  ('paypal', 'payment', 'PayPal', 80),
  ('supabase-storage', 'storage', 'Supabase Storage', 10),
  ('resend', 'notification', 'Resend (Email)', 10),
  ('whatsapp', 'notification', 'WhatsApp Business', 20)
on conflict (id) do nothing;

insert into public.settings (key, value) values
  ('pricing_tiers', '{
    "basic": {"amount_xof": 500, "label": "Basic", "includes": ["paroles", "chanson", "mp3", "partage"]},
    "premium": {"amount_xof": 1000, "label": "Premium", "includes": ["chanson", "video", "page_cadeau", "photo", "paroles_animees"]},
    "vip": {"amount_xof": 2500, "label": "VIP", "includes": ["personnalisation_avancee", "video_premium", "modification", "regeneration_incluse"]}
  }'),
  ('credit_packs', '[
    {"amount_xof": 500, "credits": 1},
    {"amount_xof": 2000, "credits": 5},
    {"amount_xof": 5000, "credits": 15}
  ]')
on conflict (key) do nothing;
