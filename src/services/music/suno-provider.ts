import "server-only";
import type {
  MusicGenerationHandle,
  MusicGenerationInput,
  MusicGenerationStatusResult,
  MusicProvider,
} from "./types";
import { MusicProviderError } from "./types";

/**
 * ADAPTER NON VÉRIFIÉ — voir README.md du dossier.
 *
 * Suno n'expose pas d'API publique officielle documentée à ce jour. Ce fichier définit le
 * contrat d'intégration (endpoints/format supposés d'après des wrappers tiers non officiels)
 * mais NE DOIT PAS être activé en production avant qu'un accès API réel (officiel ou via un
 * partenaire contractuel) soit obtenu et que les endpoints ci-dessous soient vérifiés contre
 * une documentation à jour. Tant que SUNO_API_KEY n'est pas défini, isConfigured() renvoie
 * false et MusicManager saute ce provider — aucune fausse génération n'est jamais renvoyée
 * comme réussie (règle absolue section 67-69 du cahier des charges).
 */
export class SunoProvider implements MusicProvider {
  readonly id = "suno";
  readonly displayName = "Suno (non vérifié)";

  isConfigured(): boolean {
    return Boolean(process.env.SUNO_API_KEY);
  }

  async startGeneration(input: MusicGenerationInput): Promise<MusicGenerationHandle> {
    void input;
    throw new MusicProviderError(
      this.id,
      "Intégration non vérifiée contre une documentation officielle — voir src/services/music/README.md. " +
        "Ne pas activer sans validation explicite d'un accès API réel.",
    );
  }

  async checkStatus(handle: MusicGenerationHandle): Promise<MusicGenerationStatusResult> {
    void handle;
    throw new MusicProviderError(this.id, "Intégration non vérifiée — voir README.md");
  }
}
