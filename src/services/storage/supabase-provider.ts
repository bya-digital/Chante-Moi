import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StorageBucket, StorageProvider, UploadInput, UploadResult } from "./types";
import { StorageProviderError } from "./types";

export class SupabaseStorageProvider implements StorageProvider {
  readonly id = "supabase-storage";

  isConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(input.bucket).upload(input.path, input.data, {
      contentType: input.contentType,
      upsert: true,
    });
    if (error) throw new StorageProviderError(this.id, error.message, error);

    if (input.isPublic) {
      const { data } = supabase.storage.from(input.bucket).getPublicUrl(input.path);
      return { path: input.path, publicUrl: data.publicUrl };
    }
    return { path: input.path };
  }

  async getSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds: number): Promise<string> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data) throw new StorageProviderError(this.id, error?.message ?? "URL signée indisponible");
    return data.signedUrl;
  }

  async remove(bucket: StorageBucket, path: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw new StorageProviderError(this.id, error.message, error);
  }
}
