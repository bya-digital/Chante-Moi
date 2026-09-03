import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MusicGenerationStatusResult } from "./types";
import { refundCredit } from "../credits";
import { CostTracker } from "../cost-tracker";
import { musicCostXofEstimate } from "../cost-estimates";
import { notifyUser } from "../notify-user";

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004";

  if (result.status === "COMPLETED") {
    const { data: song } = await admin
      .from("songs")
      .update({
        status: "completed",
        audio_url: result.audioUrl,
        cover_url: result.coverUrl,
        duration_seconds: result.durationSeconds,
      })
      .eq("id", songId)
      .select("title")
      .single();

    await new CostTracker().record({
      category: "music",
      providerId: providerId ?? "unknown",
      amountXof: result.costEstimate ?? musicCostXofEstimate(result.durationSeconds),
      userId,
      generationId,
    });

    await notifyUser({
      userId,
      event: "generation_completed",
      subject: "Votre chanson est prête 🎵",
      message: `« ${song?.title ?? "Votre chanson"} » est prête à écouter et à partager.`,
      actionUrl: `${siteUrl}/creations/${songId}`,
    });
  } else if (result.status === "FAILED" || result.status === "CANCELLED") {
    await admin.from("songs").update({ status: "failed" }).eq("id", songId);
    // Le crédit a été débité au démarrage de la génération (section 13) — jamais de génération
    // non livrée facturée au client.
    await refundCredit({ userId, songId });

    await notifyUser({
      userId,
      event: "generation_failed",
      subject: "Un souci avec votre chanson",
      message: "La génération de votre chanson a échoué. Votre crédit a été remboursé automatiquement — vous pouvez réessayer depuis votre espace.",
      actionUrl: `${siteUrl}/creations/${songId}`,
    });
  }
}
