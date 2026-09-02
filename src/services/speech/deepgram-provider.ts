import "server-only";
import type { SpeechProvider, TranscriptionInput, TranscriptionResult } from "./types";
import { SpeechProviderError } from "./types";

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

export class DeepgramSpeechProvider implements SpeechProvider {
  readonly id = "deepgram";
  readonly displayName = "Deepgram";

  isConfigured(): boolean {
    return Boolean(process.env.DEEPGRAM_API_KEY);
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new SpeechProviderError(this.id, "Clé API manquante");

    const params = new URLSearchParams({
      model: "nova-2",
      smart_format: "true",
      language: input.language ?? "fr",
    });

    const res = await fetch(`${DEEPGRAM_URL}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": input.audio.type || "audio/webm",
      },
      body: await input.audio.arrayBuffer(),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new SpeechProviderError(this.id, `HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      results?: {
        channels?: { alternatives?: { transcript?: string }[] }[];
      };
      metadata?: { duration?: number };
    };

    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    if (!transcript) throw new SpeechProviderError(this.id, "Transcription vide");

    return {
      transcript,
      language: input.language,
      durationSeconds: data.metadata?.duration,
      providerId: this.id,
    };
  }
}
