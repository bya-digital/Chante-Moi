import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MusicManager } from "@/services/music/manager";
import { finalizeMusicGeneration } from "@/services/music/finalize";
import { dbProviderStatusChecker } from "@/services/provider-status";

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

  type SongRef = { user_id: string } | { user_id: string }[] | null;
  const songRef = generation.songs as SongRef;
  const songUserId = Array.isArray(songRef) ? songRef[0]?.user_id : songRef?.user_id;

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
    const music = new MusicManager(undefined, dbProviderStatusChecker());
    const statusResult = await music.checkStatus(generation.provider_id, {
      providerJobId: job.data.provider_job_id,
      providerId: generation.provider_id,
    });

    if (statusResult.status !== "PROCESSING" && statusResult.status !== "PENDING" && songUserId) {
      await finalizeMusicGeneration({
        generationId: id,
        songId: generation.song_id,
        userId: songUserId,
        providerId: generation.provider_id,
        result: statusResult,
      });
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
