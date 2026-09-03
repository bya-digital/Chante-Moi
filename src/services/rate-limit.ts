import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Anti-abus minimal (section 42) : compte les requêtes récentes pour une clé (IP ou userId) et
 * refuse au-delà d'un seuil. Fail-open volontaire : si la table n'existe pas encore ou que la
 * requête échoue, on laisse passer plutôt que de casser le service pour un souci d'infra — mieux
 * vaut un risque d'abus temporaire qu'une panne totale du tunnel de création.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count, error } = await admin
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", since);

    if (error) return true;
    if ((count ?? 0) >= limit) return false;

    await admin.from("rate_limit_events").insert({ key });
    return true;
  } catch {
    return true;
  }
}

/** IP du client à partir des en-têtes de la requête — best-effort derrière un proxy/CDN */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
