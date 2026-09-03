import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/services/rate-limit";

const TIER_AMOUNTS_XOF: Record<string, number> = {
  basic: 500,
  premium: 1000,
  vip: 2500,
};

interface LyricsSectionInput {
  kind: string;
  index: number;
  text: string;
}

interface LyricsInput {
  title: string;
  sections: LyricsSectionInput[];
  fullText: string;
  language: string;
}

async function resolveId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "occasions" | "emotions" | "music_styles" | "voices",
  slug: string | undefined,
): Promise<string | null> {
  if (!slug) return null;
  const { data } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

/**
 * Crée en une fois la commande, la chanson (statut "lyrics_ready") et ses paroles validées par
 * l'utilisateur à l'étape 7 du tunnel. La génération musicale elle-même n'est déclenchée
 * qu'après confirmation serveur du paiement — voir le webhook /api/payments/webhook/[provider]
 * (section 21 du cahier des charges : jamais de génération payante avant paiement validé).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tier = body?.tier ?? "basic";
  if (!TIER_AMOUNTS_XOF[tier]) {
    return NextResponse.json({ error: "Formule invalide" }, { status: 400 });
  }

  const lyrics = body?.lyrics as LyricsInput | undefined;
  if (!lyrics?.fullText || !Array.isArray(lyrics.sections)) {
    return NextResponse.json({ error: "Paroles manquantes ou invalides" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Connexion requise pour créer une commande" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`orders-create:${user.id}`, 10, 60 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de commandes créées, réessayez plus tard" }, { status: 429 });
  }

  const [occasionId, emotionId, musicStyleId, voiceId] = await Promise.all([
    resolveId(supabase, "occasions", body?.occasionSlug),
    resolveId(supabase, "emotions", body?.emotionSlug),
    resolveId(supabase, "music_styles", body?.musicStyleSlug),
    resolveId(supabase, "voices", body?.voiceSlug),
  ]);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      occasion_id: occasionId,
      recipient_name: body?.recipientName ?? null,
      tier,
      status: "awaiting_payment",
      amount_xof: TIER_AMOUNTS_XOF[tier],
      currency: "XOF",
      country_code: body?.countryCode ?? process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "CI",
    })
    .select("id, amount_xof, currency, status")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? "Échec de la création de la commande" }, { status: 500 });
  }

  const { data: song, error: songError } = await supabase
    .from("songs")
    .insert({
      user_id: user.id,
      order_id: order.id,
      occasion_id: occasionId,
      emotion_id: emotionId,
      music_style_id: musicStyleId,
      voice_id: voiceId,
      title: lyrics.title,
      recipient_name: body?.recipientName ?? null,
      story_raw: body?.story ?? null,
      status: "lyrics_ready",
      language: lyrics.language ?? "fr",
    })
    .select("id")
    .single();

  if (songError || !song) {
    // La commande existe déjà : on ne la supprime pas (l'utilisateur pourrait vouloir réessayer),
    // mais on remonte l'erreur clairement plutôt que de laisser un paiement partir sans chanson.
    return NextResponse.json({ error: songError?.message ?? "Échec de la création de la chanson" }, { status: 500 });
  }

  const { error: lyricsError } = await supabase.from("lyrics").insert({
    song_id: song.id,
    version: 1,
    title: lyrics.title,
    full_text: lyrics.fullText,
    sections: lyrics.sections,
    language: lyrics.language ?? "fr",
    created_by: "ai",
  });

  if (lyricsError) {
    return NextResponse.json({ error: lyricsError.message }, { status: 500 });
  }

  return NextResponse.json({ order: { ...order, songId: song.id } });
}
