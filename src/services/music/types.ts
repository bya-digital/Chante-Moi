export type GenerationStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface MusicGenerationInput {
  lyrics: string;
  title: string;
  musicStyle: string;
  emotion: string;
  language: string;
  voiceType?: string;
  durationSeconds?: number;
}

export interface MusicGenerationHandle {
  /** Identifiant côté provider — à stocker dans generation_jobs.provider_job_id */
  providerJobId: string;
  providerId: string;
}

export interface MusicGenerationStatusResult {
  status: GenerationStatus;
  audioUrl?: string;
  coverUrl?: string;
  durationSeconds?: number;
  errorMessage?: string;
  /** Coût réel si le provider le communique, sinon estimé côté MusicManager */
  costEstimate?: number;
}

/**
 * Interface que tout moteur musical (texte -> chanson) doit implémenter.
 * Le reste de l'app (commandes, crédits, historique, page cadeau) ne connaît que
 * MusicManager — jamais un provider concret.
 */
export interface MusicProvider {
  readonly id: string;
  readonly displayName: string;

  /** Démarre une génération asynchrone, retourne immédiatement un identifiant de job */
  startGeneration(input: MusicGenerationInput): Promise<MusicGenerationHandle>;
  /** Interroge le statut réel — jamais une progression simulée (section 22) */
  checkStatus(handle: MusicGenerationHandle): Promise<MusicGenerationStatusResult>;

  isConfigured(): boolean;
}

export class MusicProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[MusicProvider:${providerId}] ${message}`);
    this.name = "MusicProviderError";
  }
}
