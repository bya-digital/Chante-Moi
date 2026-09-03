import { NextResponse } from "next/server";
import { AIManager } from "@/services/ai/manager";
import type { LyricsRewriteInput } from "@/services/ai/types";
import { dbProviderStatusChecker } from "@/services/provider-status";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.lyrics || !body?.instruction) {
    return NextResponse.json({ error: "Champs manquants (lyrics, instruction)" }, { status: 400 });
  }

  try {
    const ai = new AIManager(undefined, dbProviderStatusChecker());
    const lyrics = await ai.rewriteLyrics({
      lyrics: body.lyrics,
      instruction: body.instruction as LyricsRewriteInput["instruction"],
      freeInstruction: body.freeInstruction,
    });
    return NextResponse.json({ lyrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
