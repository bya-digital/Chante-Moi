import { NextResponse } from "next/server";
import { SpeechManager } from "@/services/speech/manager";
import { AIManager } from "@/services/ai/manager";
import { dbProviderStatusChecker } from "@/services/provider-status";
import { CostTracker } from "@/services/cost-tracker";
import { TRANSCRIPTION_COST_XOF } from "@/services/cost-estimates";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Fichier audio manquant" }, { status: 400 });
  }

  try {
    const speech = new SpeechManager(undefined, dbProviderStatusChecker());
    const transcription = await speech.transcribe({
      audio,
      filename: "story.webm",
      language: (form?.get("language") as string) ?? "fr",
    });

    // Nettoyage optionnel par l'IA texte (hésitations, répétitions) — best-effort, ne bloque
    // pas la réponse si l'IA texte échoue alors que la transcription a réussi.
    let cleaned = transcription.transcript;
    let detectedEmotion: string | undefined;
    try {
      const ai = new AIManager(undefined, dbProviderStatusChecker());
      const result = await ai.cleanupStory({ rawTranscript: transcription.transcript });
      cleaned = result.cleanedStory;
      detectedEmotion = result.detectedEmotion;
    } catch {
      // on garde la transcription brute
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await new CostTracker().record({
      category: "transcription",
      providerId: transcription.providerId,
      amountXof: TRANSCRIPTION_COST_XOF,
      userId: user?.id,
    });

    return NextResponse.json({ transcript: transcription.transcript, cleanedStory: cleaned, detectedEmotion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
