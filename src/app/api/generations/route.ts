import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MusicManager } from "@/services/music/manager";

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
    .select("id, user_id, title, language, order_id")
    .eq("id", body.songId)
    .single();
  if (songError || !song) return NextResponse.json({ error: "Chanson introuvable" }, { status: 404 });
  if (song.user_id !== user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { data: lyrics } = await supabase
    .from("lyrics")
    .select("full_text")
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

  try {
    const music = new MusicManager();
    const handle = await music.startGeneration({
      lyrics: lyrics.full_text,
      title: song.title ?? "Ma chanson",
      musicStyle: body.musicStyle ?? "",
      emotion: body.emotion ?? "",
      language: song.language ?? "fr",
      voiceType: body.voiceType,
    });

    await admin
      .from("generations")
      .update({ status: "PROCESSING", provider_id: handle.providerId, started_at: new Date().toISOString() })
      .eq("id", generation.id);

    await admin.from("generation_jobs").insert({
      generation_id: generation.id,
      status: "PROCESSING",
      provider_job_id: handle.providerJobId,
    });

    await admin.from("songs").update({ status: "processing" }).eq("id", song.id);

    return NextResponse.json({ generationId: generation.id, status: "PROCESSING" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await admin
      .from("generations")
      .update({ status: "FAILED", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", generation.id);
    await admin.from("songs").update({ status: "failed" }).eq("id", song.id);
    return NextResponse.json({ error: message, generationId: generation.id }, { status: 502 });
  }
}
