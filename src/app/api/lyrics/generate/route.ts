import { NextResponse } from "next/server";
import { AIManager } from "@/services/ai/manager";
import type { StoryEmotion } from "@/services/ai/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.story || !body?.occasion || !body?.emotion || !body?.musicStyle) {
    return NextResponse.json({ error: "Champs manquants (story, occasion, emotion, musicStyle)" }, { status: 400 });
  }

  try {
    const ai = new AIManager();
    const lyrics = await ai.generateLyrics({
      story: body.story,
      occasion: body.occasion,
      recipientName: body.recipientName,
      emotion: body.emotion as StoryEmotion,
      musicStyle: body.musicStyle,
      language: body.language ?? "fr",
    });
    return NextResponse.json({ lyrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
