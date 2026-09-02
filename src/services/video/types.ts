export type VideoFormat = "9:16" | "1:1" | "4:5" | "16:9";
export type GenerationStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface VideoGenerationInput {
  audioUrl: string;
  coverImageUrl?: string;
  userPhotoUrl?: string;
  lyricsText?: string;
  title: string;
  format: VideoFormat;
}

export interface VideoGenerationResult {
  status: GenerationStatus;
  videoUrl?: string;
  errorMessage?: string;
}

/**
 * V2/V3 (section 25). Combine photo + audio + paroles via FFmpeg pour les opérations
 * déterministes (pas d'IA générative vidéo dans le MVP). Interface posée dès maintenant pour
 * que le schéma DB (media_files, songs.video_status) et les boutons UI ("Créer une vidéo")
 * n'aient pas besoin d'être retouchés quand ce module sera implémenté.
 */
export interface VideoProvider {
  readonly id: string;
  generate(input: VideoGenerationInput): Promise<VideoGenerationResult>;
  isConfigured(): boolean;
}
