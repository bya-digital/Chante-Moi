import "server-only";
import { ElevenLabsMusicProvider } from "./elevenlabs-provider";
import { SunoProvider } from "./suno-provider";
import type {
  MusicGenerationHandle,
  MusicGenerationInput,
  MusicGenerationStatusResult,
  MusicProvider,
} from "./types";
import { MusicProviderError } from "./types";
import type { ProviderStatusChecker } from "../ai/manager";

const alwaysActive: ProviderStatusChecker = { isActive: async () => true };

/**
 * Point d'entrée UNIQUE pour la génération musicale. Voir README.md : aucun provider n'est
 * vérifié/production-ready pour l'instant, donc startGeneration() échoue explicitement tant
 * qu'aucun provider configuré n'est disponible — jamais de fausse réussite.
 */
export class MusicManager {
  private providers: MusicProvider[];
  private statusChecker: ProviderStatusChecker;

  constructor(providers?: MusicProvider[], statusChecker?: ProviderStatusChecker) {
    this.providers = providers ?? [new ElevenLabsMusicProvider(), new SunoProvider()];
    this.statusChecker = statusChecker ?? alwaysActive;
  }

  private async firstEligible(): Promise<MusicProvider> {
    for (const p of this.providers) {
      if (p.isConfigured() && (await this.statusChecker.isActive(p.id))) return p;
    }
    throw new MusicProviderError(
      "music-manager",
      "Aucun moteur musical configuré/actif — voir src/services/music/README.md",
    );
  }

  async startGeneration(input: MusicGenerationInput): Promise<MusicGenerationHandle> {
    const provider = await this.firstEligible();
    return provider.startGeneration(input);
  }

  async checkStatus(
    providerId: string,
    handle: MusicGenerationHandle,
  ): Promise<MusicGenerationStatusResult> {
    const provider = this.providers.find((p) => p.id === providerId);
    if (!provider) throw new MusicProviderError("music-manager", `Provider inconnu: ${providerId}`);
    return provider.checkStatus(handle);
  }
}
