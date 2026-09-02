import "server-only";
import { StorageManager } from "../storage/manager";
import type {
  MusicGenerationHandle,
  MusicGenerationInput,
  MusicGenerationLyricsSection,
  MusicGenerationStatusResult,
  MusicProvider,
} from "./types";
import { MusicProviderError } from "./types";

const ELEVENLABS_MUSIC_URL = "https://api.elevenlabs.io/v1/music";

/**
 * ElevenLabs "Eleven Music" — seul moteur "paroles -> chanson chantée" avec une API publique
 * documentée identifiée à ce jour (voir README.md du dossier). Endpoint et header d'auth
 * (xi-api-key, PAS Authorization: Bearer) vérifiés contre la documentation ElevenLabs en
 * septembre 2026. SYNCHRONE : la requête attend la génération complète et renvoie l'audio
 * directement (pas de webhook/job à interroger) — d'où le MusicGenerationHandle.immediateResult
 * rempli directement dans startGeneration().
 */

const DEFAULT_SECTION_DURATION_MS: Record<string, number> = {
  intro: 8000,
  couplet: 25000,
  pre_refrain: 8000,
  refrain: 18000,
  pont: 15000,
  outro: 10000,
};

function buildCompositionPlan(input: MusicGenerationInput) {
  const globalStyles = [input.musicStyle, input.emotion].filter(Boolean);

  const sections: MusicGenerationLyricsSection[] =
    input.sections && input.sections.length > 0
      ? input.sections
      : [{ kind: "couplet", text: input.lyrics }];

  return {
    positive_global_styles: globalStyles,
    negative_global_styles: [],
    sections: sections.map((s) => ({
      section_name: s.kind,
      positive_local_styles: [],
      negative_local_styles: [],
      duration_ms: DEFAULT_SECTION_DURATION_MS[s.kind] ?? 20000,
      lines: s.text.split("\n").map((l) => l.trim()).filter(Boolean),
    })),
  };
}

export class ElevenLabsMusicProvider implements MusicProvider {
  readonly id = "elevenlabs";
  readonly displayName = "ElevenLabs (Eleven Music)";

  isConfigured(): boolean {
    return Boolean(process.env.ELEVENLABS_API_KEY);
  }

  async startGeneration(input: MusicGenerationInput): Promise<MusicGenerationHandle> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new MusicProviderError(this.id, "ELEVENLABS_API_KEY manquant");

    const compositionPlan = buildCompositionPlan(input);
    const totalDurationMs = compositionPlan.sections.reduce((sum, s) => sum + s.duration_ms, 0);

    const res = await fetch(ELEVENLABS_MUSIC_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        composition_plan: compositionPlan,
        model_id: "music_v2",
        output_format: "mp3_44100_128",
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new MusicProviderError(this.id, `HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const audioBuffer = await res.arrayBuffer();
    const path = `${crypto.randomUUID()}.mp3`;

    const storage = new StorageManager();
    const upload = await storage.upload({
      bucket: "audio",
      path,
      data: audioBuffer,
      contentType: "audio/mpeg",
      isPublic: true,
    });

    const jobId = crypto.randomUUID();
    return {
      providerJobId: jobId,
      providerId: this.id,
      immediateResult: {
        status: "COMPLETED",
        audioUrl: upload.publicUrl,
        durationSeconds: Math.round(totalDurationMs / 1000),
        // ~900 crédits/minute au tarif de base (voir README.md) — coût réel en FCFA à calibrer
        // une fois le plan ElevenLabs choisi ; ce champ reste indicatif tant que ce n'est pas fait.
        costEstimate: undefined,
      },
    };
  }

  async checkStatus(): Promise<MusicGenerationStatusResult> {
    // Ce provider est synchrone : le résultat est déjà renvoyé par startGeneration() via
    // immediateResult. Un appelant qui arrive ici a un bug d'intégration.
    throw new MusicProviderError(
      this.id,
      "Provider synchrone — le résultat est déjà disponible via MusicGenerationHandle.immediateResult, checkStatus() ne devrait pas être appelé.",
    );
  }
}
