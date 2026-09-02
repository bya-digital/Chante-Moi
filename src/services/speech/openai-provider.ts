import "server-only";
import type { SpeechProvider, TranscriptionInput, TranscriptionResult } from "./types";
import { SpeechProviderError } from "./types";

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-1";

export class OpenAISpeechProvider implements SpeechProvider {
  readonly id = "openai-whisper";
  readonly displayName = "OpenAI Whisper";

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY_SPEECH ?? process.env.OPENAI_API_KEY);
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const apiKey = process.env.OPENAI_API_KEY_SPEECH ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new SpeechProviderError(this.id, "Clé API manquante");

    const form = new FormData();
    form.append("file", input.audio, input.filename);
    form.append("model", DEFAULT_MODEL);
    if (input.language) form.append("language", input.language);

    const res = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new SpeechProviderError(this.id, `HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as { text?: string; language?: string; duration?: number };
    if (!data.text) throw new SpeechProviderError(this.id, "Transcription vide");

    return {
      transcript: data.text,
      language: data.language ?? input.language,
      durationSeconds: data.duration,
      providerId: this.id,
    };
  }
}
