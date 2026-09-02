export type StorageBucket = "audio" | "video" | "covers" | "user-uploads" | "voice-recordings";

export interface UploadInput {
  bucket: StorageBucket;
  path: string;
  data: Blob | ArrayBuffer;
  contentType: string;
  /** true pour les buckets publics (covers), false pour les fichiers sensibles (voice-recordings) */
  isPublic: boolean;
}

export interface UploadResult {
  path: string;
  publicUrl?: string;
}

export interface StorageProvider {
  readonly id: string;
  upload(input: UploadInput): Promise<UploadResult>;
  /** URL signée temporaire pour un fichier privé (section 60) */
  getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds: number): Promise<string>;
  remove(bucket: StorageBucket, path: string): Promise<void>;
  isConfigured(): boolean;
}

export class StorageProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[StorageProvider:${providerId}] ${message}`);
    this.name = "StorageProviderError";
  }
}
