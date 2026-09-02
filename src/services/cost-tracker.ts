import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CostCategory =
  | "transcription"
  | "ai_text"
  | "music"
  | "video"
  | "storage"
  | "payment_fees";

export interface CostEntry {
  category: CostCategory;
  providerId: string;
  amountXof: number;
  userId?: string;
  orderId?: string;
  generationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * CostTracker centralisé (section 18/70). Chaque opération payante (transcription, IA,
 * musique, vidéo, stockage, frais de paiement) doit passer par record() pour que le dashboard
 * admin (coût moyen/chanson, marge brute) reflète la réalité — jamais de coût "estimé à la main"
 * ailleurs dans le code.
 */
export class CostTracker {
  async record(entry: CostEntry): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("generation_costs").insert({
      category: entry.category,
      provider_id: entry.providerId,
      amount_xof: entry.amountXof,
      user_id: entry.userId ?? null,
      order_id: entry.orderId ?? null,
      generation_id: entry.generationId ?? null,
      metadata: entry.metadata ?? {},
    });
    // Ne jamais faire échouer l'opération métier (génération, paiement) à cause d'un
    // échec de journalisation de coût — on log côté serveur seulement.
    if (error) console.error("[CostTracker] échec insertion generation_costs:", error.message);
  }
}
