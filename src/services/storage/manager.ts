import "server-only";
import { SupabaseStorageProvider } from "./supabase-provider";
import type { StorageBucket, UploadInput, UploadResult } from "./types";
import { StorageProviderError } from "./types";

/**
 * Point d'entrée UNIQUE pour le stockage. Un CloudinaryProvider pourra être ajouté plus tard
 * (section 5) sans que le reste de l'app change — il suffira de l'enregistrer ici.
 */
export class StorageManager {
  private provider = new SupabaseStorageProvider();

  upload(input: UploadInput): Promise<UploadResult> {
    if (!this.provider.isConfigured()) {
      throw new StorageProviderError("storage-manager", "Aucun provider de stockage configuré");
    }
    return this.provider.upload(input);
  }

  getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds = 3600): Promise<string> {
    return this.provider.getSignedUrl(bucket, path, expiresInSeconds);
  }

  remove(bucket: StorageBucket, path: string): Promise<void> {
    return this.provider.remove(bucket, path);
  }
}
