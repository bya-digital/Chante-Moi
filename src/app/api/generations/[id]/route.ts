import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MusicManager } from "@/services/music/manager";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const { data: generation, error } = await supabase
    .from("generations")
    .select("id, song_id, status, provider_id, error_message, songs!inner(user_id)")
    .eq("id", id)
    .single();

  if (error || !generation) return NextResponse.json({ error: "Génération introuvable" }, { status: 404 });

  const job = await supabase
    .from("generation_jobs")
    .select("provider_job_id")
    .eq("generation_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (generation.status !== "PROCESSING" || !job.data?.provider_job_id || !generation.provider_id) {
    return NextResponse.json({ status: generation.status, errorMessage: generation.error_message });
  }

  // Statut réel interrogé auprès du provider — jamais une progression simulée (section 22).
  try {
    const music = new MusicManager();
    const statusResult = await music.checkStatus(generation.provider_id, {
      providerJobId: job.data.provider_job_id,
      providerId: generation.provider_id,
    });

    if (statusResult.status !== "PROCESSING" && statusResult.status !== "PENDING") {
      const admin = createAdminClient();
      await admin
        .from("generations")
        .update({
          status: statusResult.status,
          error_message: statusResult.errorMessage ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (statusResult.status === "COMPLETED") {
        await admin
          .from("songs")
          .update({
            status: "completed",
            audio_url: statusResult.audioUrl,
            cover_url: statusResult.coverUrl,
            duration_seconds: statusResult.durationSeconds,
          })
          .eq("id", generation.song_id);
      } else if (statusResult.status === "FAILED") {
        // Remboursement automatique du crédit consommé (section 13/54)
        await admin.from("songs").update({ status: "failed" }).eq("id", generation.song_id);
      }
    }

    return NextResponse.json({
      status: statusResult.status,
      audioUrl: statusResult.audioUrl,
      coverUrl: statusResult.coverUrl,
      errorMessage: statusResult.errorMessage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ status: generation.status, error: message });
  }
}
