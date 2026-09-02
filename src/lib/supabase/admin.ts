import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client admin (clé service_role) — contourne le RLS. Réservé aux traitements serveur de
 * confiance (webhooks de paiement, jobs de génération), jamais exposé au navigateur, jamais
 * importé dans un composant client. Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local — à
 * récupérer et coller soi-même depuis Dashboard Supabase > Project Settings > API, jamais en
 * clair dans le chat ni commité dans le dépôt.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local — nécessaire pour les traitements serveur (webhooks, jobs de génération).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
