import "server-only";
import { OpenAISpeechProvider } from "./openai-provider";
import { DeepgramSpeechProvider } from "./deepgram-provider";
import type { SpeechProvider, TranscriptionInput, TranscriptionResult } from "./types";
import { SpeechProviderError } from "./types";
import type { ProviderStatusChecker } from "../ai/manager";

const alwaysActive: ProviderStatusChecker = { isActive: async () => true };

/**
 * Point d'entrée UNIQUE pour la transcription vocale (mode "Racontez votre histoire").
 * Ordre: OpenAI Whisper -> Deepgram. Ne jamais dépendre d'un seul fournisseur (section 7).
 */
export class SpeechManager {
  private providers: SpeechProvider[];
  private statusChecker: ProviderStatusChecker;

  constructor(providers?: SpeechProvider[], statusChecker?: ProviderStatusChecker) {
    this.providers = providers ?? [new OpenAISpeechProvider(), new DeepgramSpeechProvider()];
    this.statusChecker = statusChecker ?? alwaysActive;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    let lastError: unknown;
    for (const provider of this.providers) {
      if (!provider.isConfigured()) continue;
      if (!(await this.statusChecker.isActive(provider.id))) continue;
      try {
        return await provider.transcribe(input);
      } catch (err) {
        lastError = err;
      }
    }
    throw new SpeechProviderError(
      "speech-manager",
      "Aucun provider de transcription configuré/actif n'a réussi",
      lastError,
    );
  }
}
