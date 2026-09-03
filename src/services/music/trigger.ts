import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MusicManager } from "./manager";
import { finalizeMusicGeneration } from "./finalize";
import { dbProviderStatusChecker } from "../provider-status";
import { consumeCredit, refundCredit } from "../credits";

/**
 * Démarre la génération musicale d'une chanson côté serveur (admin client, pas de session
 * utilisateur — utilisé par le webhook de paiement une fois le paiement confirmé, section 21 :
 * la génération payante ne doit être déclenchée qu'après paiement validé). Best-effort : les
 * erreurs sont journalisées mais ne font jamais échouer l'appelant (le paiement reste valide
 * même si la génération doit être relancée manuellement ensuite).
 */
export async function triggerSongGeneration(songId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: song } = await admin
    .from("songs")
    .select(
      "id, user_id, title, language, music_style_id, emotion_id, voice_id, music_styles(name), emotions(slug), voices(slug), orders(country_code)",
    )
    .eq("id", songId)
    .single();

  if (!song) {
    await admin.from("provider_logs").insert({
      provider_type: "music",
      provider_id: "trigger",
      action: "start_generation",
      success: false,
      error_message: `songId introuvable: ${songId}`,
    });
    return;
  }

  const { data: lyrics } = await admin
    .from("lyrics")
    .select("full_text, sections")
    .eq("song_id", songId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lyrics) {
    await admin.from("provider_logs").insert({
      provider_type: "music",
      provider_id: "trigger",
      action: "start_generation",
      success: false,
      error_message: `Aucunes paroles pour la chanson ${songId}`,
    });
    return;
  }

  const { data: generation } = await admin
    .from("generations")
    .insert({ song_id: songId, type: "music", status: "PENDING" })
    .select("id")
    .single();

  if (!generation) return;

  const consumed = await consumeCredit({ userId: song.user_id, songId });
  if (!consumed) {
    await admin
      .from("generations")
      .update({ status: "FAILED", error_message: "Crédit insuffisant", completed_at: new Date().toISOString() })
      .eq("id", generation.id);
    await admin.from("songs").update({ status: "failed" }).eq("id", songId);
    await admin.from("provider_logs").insert({
      provider_type: "music",
      provider_id: "credits",
      action: "consume_credit",
      success: false,
      error_message: `Crédit insuffisant pour l'utilisateur ${song.user_id} (chanson ${songId})`,
      user_id: song.user_id,
    });
    return;
  }

  type MusicStyleRef = { name: string } | { name: string }[] | null;
  type SlugRef = { slug: string } | { slug: string }[] | null;
  type OrderRef = { country_code: string } | { country_code: string }[] | null;
  const first = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const musicStyle = first(song.music_styles as MusicStyleRef);
  const emotion = first(song.emotions as SlugRef);
  const voice = first(song.voices as SlugRef);
  const order = first(song.orders as OrderRef);

  try {
    const music = new MusicManager(undefined, dbProviderStatusChecker());
    const handle = await music.startGeneration({
      lyrics: lyrics.full_text,
      sections: Array.isArray(lyrics.sections) ? (lyrics.sections as { kind: string; text: string }[]) : undefined,
      title: song.title ?? "Ma chanson",
      musicStyle: musicStyle?.name ?? "",
      emotion: emotion?.slug ?? "",
      language: song.language ?? "fr",
      voiceType: voice?.slug,
      countryCode: order?.country_code,
    });

    await admin
      .from("generations")
      .update({ status: "PROCESSING", provider_id: handle.providerId, started_at: new Date().toISOString() })
      .eq("id", generation.id);

    await admin.from("generation_jobs").insert({
      generation_id: generation.id,
      status: handle.immediateResult ? handle.immediateResult.status : "PROCESSING",
      provider_job_id: handle.providerJobId,
    });

    if (handle.immediateResult) {
      await finalizeMusicGeneration({
        generationId: generation.id,
        songId,
        userId: song.user_id,
        providerId: handle.providerId,
        result: handle.immediateResult,
      });
    } else {
      await admin.from("songs").update({ status: "processing" }).eq("id", songId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await admin
      .from("generations")
      .update({ status: "FAILED", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", generation.id);
    await admin.from("songs").update({ status: "failed" }).eq("id", songId);
    await admin.from("provider_logs").insert({
      provider_type: "music",
      provider_id: "trigger",
      action: "start_generation",
      success: false,
      error_message: message,
    });
    // Le crédit a été débité avant l'appel au provider (voir consumeCredit ci-dessus) — la
    // génération n'a jamais démarré, il faut le recréditer.
    await refundCredit({ userId: song.user_id, songId });
  }
}
