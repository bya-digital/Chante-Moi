import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MusicManager } from "@/services/music/manager";
import { finalizeMusicGeneration } from "@/services/music/finalize";
import { dbProviderStatusChecker } from "@/services/provider-status";
import { consumeCredit, refundCredit } from "@/services/credits";

/**
 * Démarre une génération musicale asynchrone (section 52) : ne bloque jamais la requête HTTP
 * pendant plusieurs minutes. Le frontend récupère ensuite le statut via GET /api/generations/[id].
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.songId) return NextResponse.json({ error: "songId manquant" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const { data: song, error: songError } = await supabase
    .from("songs")
    .select("id, user_id, title, language, order_id, orders(country_code)")
    .eq("id", body.songId)
    .single();
  if (songError || !song) return NextResponse.json({ error: "Chanson introuvable" }, { status: 404 });
  if (song.user_id !== user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { data: lyrics } = await supabase
    .from("lyrics")
    .select("full_text, sections")
    .eq("song_id", song.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lyrics) return NextResponse.json({ error: "Aucunes paroles générées pour cette chanson" }, { status: 400 });

  const admin = createAdminClient();
  const { data: generation, error: genError } = await admin
    .from("generations")
    .insert({ song_id: song.id, type: "music", status: "PENDING" })
    .select("id")
    .single();
  if (genError || !generation) return NextResponse.json({ error: "Impossible de créer la génération" }, { status: 500 });

  const consumed = await consumeCredit({ userId: user.id, songId: song.id });
  if (!consumed) {
    await admin
      .from("generations")
      .update({ status: "FAILED", error_message: "Crédit insuffisant", completed_at: new Date().toISOString() })
      .eq("id", generation.id);
    await admin.from("songs").update({ status: "failed" }).eq("id", song.id);
    return NextResponse.json({ error: "Crédit insuffisant", generationId: generation.id }, { status: 402 });
  }

  try {
    const music = new MusicManager(undefined, dbProviderStatusChecker());
    const sections = Array.isArray(lyrics.sections)
      ? (lyrics.sections as { kind: string; text: string }[])
      : undefined;

    type OrderRef = { country_code: string } | { country_code: string }[] | null;
    const orderRef = song.orders as OrderRef;
    const countryCode = Array.isArray(orderRef) ? orderRef[0]?.country_code : orderRef?.country_code;

    const handle = await music.startGeneration({
      lyrics: lyrics.full_text,
      sections,
      title: song.title ?? "Ma chanson",
      musicStyle: body.musicStyle ?? "",
      emotion: body.emotion ?? "",
      language: song.language ?? "fr",
      voiceType: body.voiceType,
      countryCode,
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
      // Provider synchrone (ex. ElevenLabs) : le résultat est déjà connu, on finalise tout de
      // suite plutôt que de renvoyer un statut PROCESSING que le frontend devrait poller.
      await finalizeMusicGeneration({
        generationId: generation.id,
        songId: song.id,
        userId: user.id,
        providerId: handle.providerId,
        result: handle.immediateResult,
      });
      return NextResponse.json({
        generationId: generation.id,
        status: handle.immediateResult.status,
        audioUrl: handle.immediateResult.audioUrl,
      });
    }

    await admin.from("songs").update({ status: "processing" }).eq("id", song.id);

    return NextResponse.json({ generationId: generation.id, status: "PROCESSING" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await admin
      .from("generations")
      .update({ status: "FAILED", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", generation.id);
    await admin.from("songs").update({ status: "failed" }).eq("id", song.id);
    // Le crédit a été débité avant l'appel au provider — la génération n'a jamais démarré, il
    // faut le recréditer.
    await refundCredit({ userId: user.id, songId: song.id });
    return NextResponse.json({ error: message, generationId: generation.id }, { status: 502 });
  }
}
