export type StoryEmotion =
  | "emotionnel"
  | "romantique"
  | "joyeux"
  | "festif"
  | "humoristique"
  | "solennel"
  | "inspirant"
  | "spirituel"
  | "nostalgique"
  | "energique";

export interface LyricsGenerationInput {
  /** Histoire brute racontée par l'utilisateur (texte ou transcription vocale nettoyée) */
  story: string;
  occasion: string;
  recipientName?: string;
  emotion: StoryEmotion;
  musicStyle: string;
  language?: string;
  /** Contraintes de structure optionnelles (certains styles n'ont pas de pont, etc.) */
  desiredSections?: LyricsSectionKind[];
}

export type LyricsSectionKind =
  | "intro"
  | "couplet"
  | "pre_refrain"
  | "refrain"
  | "pont"
  | "outro";

export interface LyricsSection {
  kind: LyricsSectionKind;
  index: number;
  text: string;
}

export interface GeneratedLyrics {
  title: string;
  sections: LyricsSection[];
  /** Texte complet assemblé, tel qu'envoyé au moteur musical */
  fullText: string;
  language: string;
}

export interface LyricsRewriteInput {
  lyrics: GeneratedLyrics;
  instruction: "raccourcir" | "rallonger" | "changer_ton" | "regenerer" | "libre";
  freeInstruction?: string;
}

export interface StoryCleanupInput {
  /** Transcription brute issue du speech-to-text */
  rawTranscript: string;
}

export interface StoryCleanupResult {
  cleanedStory: string;
  detectedEmotion?: StoryEmotion;
  extractedFacts: {
    recipientName?: string;
    relationship?: string;
    keyMoments?: string[];
  };
}

/**
 * Interface que toute IA texte (génération/compréhension) doit implémenter.
 * Aucun composant métier ne doit importer un SDK provider directement —
 * uniquement AIManager, qui parle à cette interface.
 */
export interface AIProvider {
  readonly id: string;
  readonly displayName: string;

  generateLyrics(input: LyricsGenerationInput): Promise<GeneratedLyrics>;
  rewriteLyrics(input: LyricsRewriteInput): Promise<GeneratedLyrics>;
  cleanupStory(input: StoryCleanupInput): Promise<StoryCleanupResult>;

  /** Vérifie que le provider est configuré (clé API présente, etc.) */
  isConfigured(): boolean;
}

export class AIProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[AIProvider:${providerId}] ${message}`);
    this.name = "AIProviderError";
  }
}
