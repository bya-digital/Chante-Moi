import "server-only";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import type {
  AIProvider,
  GeneratedLyrics,
  LyricsGenerationInput,
  LyricsRewriteInput,
  StoryCleanupInput,
  StoryCleanupResult,
} from "./types";
import { AIProviderError } from "./types";

export interface ProviderStatusChecker {
  /** Doit refléter le kill switch admin (table provider_configs) — true par défaut si absent */
  isActive(providerId: string): Promise<boolean>;
}

const alwaysActive: ProviderStatusChecker = { isActive: async () => true };

/**
 * Point d'entrée UNIQUE pour la génération/compréhension de texte par IA.
 * Aucun composant métier ne doit importer OpenAIProvider/AnthropicProvider directement.
 * Ordre de priorité: OpenAI (principal) -> Anthropic (fallback), sauf providers désactivés
 * depuis l'admin (kill switch, voir section 19 du cahier des charges) ou non configurés.
 */
export class AIManager {
  private providers: AIProvider[];
  private statusChecker: ProviderStatusChecker;
  /** Provider ayant servi le dernier appel réussi — lu par l'appelant pour le cost tracking (section 18) */
  lastUsedProviderId: string | null = null;

  constructor(providers?: AIProvider[], statusChecker?: ProviderStatusChecker) {
    this.providers = providers ?? [new OpenAIProvider(), new AnthropicProvider()];
    this.statusChecker = statusChecker ?? alwaysActive;
  }

  private async eligibleProviders(): Promise<AIProvider[]> {
    const eligible: AIProvider[] = [];
    for (const p of this.providers) {
      if (!p.isConfigured()) continue;
      if (!(await this.statusChecker.isActive(p.id))) continue;
      eligible.push(p);
    }
    return eligible;
  }

  private async withFallback<T>(op: (p: AIProvider) => Promise<T>): Promise<T> {
    const providers = await this.eligibleProviders();
    if (providers.length === 0) {
      throw new AIProviderError("ai-manager", "Aucun provider IA configuré ou actif");
    }

    let lastError: unknown;
    for (const provider of providers) {
      try {
        const result = await op(provider);
        this.lastUsedProviderId = provider.id;
        return result;
      } catch (err) {
        lastError = err;
      }
    }
    throw new AIProviderError(
      "ai-manager",
      `Tous les providers IA ont échoué (${providers.map((p) => p.id).join(", ")})`,
      lastError,
    );
  }

  generateLyrics(input: LyricsGenerationInput): Promise<GeneratedLyrics> {
    return this.withFallback((p) => p.generateLyrics(input));
  }

  rewriteLyrics(input: LyricsRewriteInput): Promise<GeneratedLyrics> {
    return this.withFallback((p) => p.rewriteLyrics(input));
  }

  cleanupStory(input: StoryCleanupInput): Promise<StoryCleanupResult> {
    return this.withFallback((p) => p.cleanupStory(input));
  }
}
