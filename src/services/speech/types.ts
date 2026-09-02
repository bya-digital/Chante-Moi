export interface TranscriptionInput {
  /** Fichier audio brut (webm/mp3/wav) */
  audio: Blob;
  filename: string;
  language?: string;
}

export interface TranscriptionResult {
  transcript: string;
  language?: string;
  durationSeconds?: number;
  providerId: string;
}

export interface SpeechProvider {
  readonly id: string;
  readonly displayName: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
  isConfigured(): boolean;
}

export class SpeechProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[SpeechProvider:${providerId}] ${message}`);
    this.name = "SpeechProviderError";
  }
}
