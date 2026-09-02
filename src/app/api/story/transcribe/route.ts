import { NextResponse } from "next/server";
import { SpeechManager } from "@/services/speech/manager";
import { AIManager } from "@/services/ai/manager";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Fichier audio manquant" }, { status: 400 });
  }

  try {
    const speech = new SpeechManager();
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
      const ai = new AIManager();
      const result = await ai.cleanupStory({ rawTranscript: transcription.transcript });
      cleaned = result.cleanedStory;
      detectedEmotion = result.detectedEmotion;
    } catch {
      // on garde la transcription brute
    }

    return NextResponse.json({ transcript: transcription.transcript, cleanedStory: cleaned, detectedEmotion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
