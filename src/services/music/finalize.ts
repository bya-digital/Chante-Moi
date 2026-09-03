import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MusicGenerationStatusResult } from "./types";
import { refundCredit } from "../credits";
import { CostTracker } from "../cost-tracker";
import { musicCostXofEstimate } from "../cost-estimates";

/**
 * Applique le résultat terminal d'une génération musicale (COMPLETED/FAILED/CANCELLED) aux
 * tables generations/songs. Partagé entre le chemin synchrone (immediateResult renvoyé
 * directement par startGeneration, ex. ElevenLabs) et le chemin asynchrone (polling via
 * GET /api/generations/[id], pour un futur provider par job) afin que les deux chemins
 * mettent la DB à jour de façon identique.
 */
export async function finalizeMusicGeneration(params: {
  generationId: string;
  songId: string;
  userId: string;
  providerId?: string;
  result: MusicGenerationStatusResult;
}) {
  const { generationId, songId, userId, providerId, result } = params;
  const admin = createAdminClient();

  await admin
    .from("generations")
    .update({
      status: result.status,
      error_message: result.errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", generationId);

  if (result.status === "COMPLETED") {
    await admin
      .from("songs")
      .update({
        status: "completed",
        audio_url: result.audioUrl,
        cover_url: result.coverUrl,
        duration_seconds: result.durationSeconds,
      })
      .eq("id", songId);

    await new CostTracker().record({
      category: "music",
      providerId: providerId ?? "unknown",
      amountXof: result.costEstimate ?? musicCostXofEstimate(result.durationSeconds),
      userId,
      generationId,
    });
  } else if (result.status === "FAILED" || result.status === "CANCELLED") {
    await admin.from("songs").update({ status: "failed" }).eq("id", songId);
    // Le crédit a été débité au démarrage de la génération (section 13) — jamais de génération
    // non livrée facturée au client.
    await refundCredit({ userId, songId });
  }
}
