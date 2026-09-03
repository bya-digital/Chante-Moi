import { NextResponse } from "next/server";
import { AIManager } from "@/services/ai/manager";
import type { StoryEmotion } from "@/services/ai/types";
import { dbProviderStatusChecker } from "@/services/provider-status";
import { CostTracker } from "@/services/cost-tracker";
import { AI_TEXT_COST_XOF } from "@/services/cost-estimates";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIp } from "@/services/rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.story || !body?.occasion || !body?.emotion || !body?.musicStyle) {
    return NextResponse.json({ error: "Champs manquants (story, occasion, emotion, musicStyle)" }, { status: 400 });
  }

  // Endpoint accessible sans connexion (le tunnel génère un aperçu avant paiement) — limite par
  // IP pour éviter qu'un script ne consomme le budget IA (section 42).
  const allowed = await checkRateLimit(`lyrics-generate:${clientIp(request)}`, 15, 10 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez dans quelques minutes" }, { status: 429 });
  }

  try {
    const ai = new AIManager(undefined, dbProviderStatusChecker());
    const lyrics = await ai.generateLyrics({
      story: body.story,
      occasion: body.occasion,
      recipientName: body.recipientName,
      emotion: body.emotion as StoryEmotion,
      musicStyle: body.musicStyle,
      language: body.language ?? "fr",
    });

    // Best-effort : la génération de paroles n'a pas besoin d'un compte, l'utilisateur peut
    // ne pas encore être connecté à cette étape du tunnel — userId reste optionnel.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await new CostTracker().record({
      category: "ai_text",
      providerId: ai.lastUsedProviderId ?? "unknown",
      amountXof: AI_TEXT_COST_XOF,
      userId: user?.id,
    });

    return NextResponse.json({ lyrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
