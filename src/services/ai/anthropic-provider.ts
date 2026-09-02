import "server-only";
import {
  type AIProvider,
  type GeneratedLyrics,
  type LyricsGenerationInput,
  type LyricsRewriteInput,
  type LyricsSection,
  type StoryCleanupInput,
  type StoryCleanupResult,
  AIProviderError,
} from "./types";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

async function callClaudeJson(params: {
  apiKey: string;
  system: string;
  user: string;
  model?: string;
}): Promise<Record<string, unknown>> {
  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: params.model ?? DEFAULT_MODEL,
      max_tokens: 2000,
      system: `${params.system}\nRéponds UNIQUEMENT avec l'objet JSON demandé, sans texte autour, sans balises markdown.`,
      messages: [{ role: "user", content: params.user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new AIProviderError("anthropic", `HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new AIProviderError("anthropic", "Réponse vide du modèle");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new AIProviderError("anthropic", "Réponse non-JSON du modèle");

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (cause) {
    throw new AIProviderError("anthropic", "JSON invalide dans la réponse", cause);
  }
}

function sectionsFromRaw(raw: unknown): LyricsSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s, i) => {
      const kind = String((s as Record<string, unknown>)?.kind ?? "couplet");
      const text = String((s as Record<string, unknown>)?.text ?? "");
      return { kind: kind as LyricsSection["kind"], index: i, text };
    })
    .filter((s) => s.text.trim().length > 0);
}

const LYRICS_SYSTEM_PROMPT = `Tu es un auteur-compositeur professionnel spécialisé dans les chansons personnalisées pour l'Afrique francophone.
Tu écris des paroles émouvantes, sincères, jamais génériques, à partir de l'histoire réelle racontée par un client.
Format JSON strict:
{
  "title": "titre court et percutant",
  "language": "fr",
  "sections": [
    { "kind": "intro" | "couplet" | "pre_refrain" | "refrain" | "pont" | "outro", "text": "paroles de la section" }
  ]
}
Règles: n'invente pas de faits contredisant l'histoire, adapte vocabulaire/rythme au style et à l'émotion,
refrain mémorable, ne force pas une structure complète si le style ne s'y prête pas.`;

/**
 * Fallback à OpenAIProvider — activé automatiquement par AIManager si OpenAI échoue
 * ou est désactivé depuis l'admin (kill switch).
 */
export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly displayName = "Anthropic (Claude)";

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  private apiKey(): string {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new AIProviderError(this.id, "ANTHROPIC_API_KEY manquant");
    return key;
  }

  async generateLyrics(input: LyricsGenerationInput): Promise<GeneratedLyrics> {
    const user = JSON.stringify({
      histoire: input.story,
      occasion: input.occasion,
      destinataire: input.recipientName ?? null,
      emotion: input.emotion,
      style_musical: input.musicStyle,
      langue: input.language ?? "fr",
    });

    const json = await callClaudeJson({
      apiKey: this.apiKey(),
      system: LYRICS_SYSTEM_PROMPT,
      user: `Voici les informations de la commande:\n${user}`,
    });

    const sections = sectionsFromRaw(json.sections);
    return {
      title: String(json.title ?? "Ma chanson"),
      language: String(json.language ?? input.language ?? "fr"),
      sections,
      fullText: sections.map((s) => s.text).join("\n\n"),
    };
  }

  async rewriteLyrics(input: LyricsRewriteInput): Promise<GeneratedLyrics> {
    const instructionMap: Record<LyricsRewriteInput["instruction"], string> = {
      raccourcir: "Raccourcis les paroles en gardant l'émotion principale.",
      rallonger: "Rallonge les paroles en ajoutant des détails cohérents avec l'histoire.",
      changer_ton: "Change le ton tout en gardant le sens général.",
      regenerer: "Propose une version complètement nouvelle avec la même histoire de base.",
      libre: input.freeInstruction ?? "Améliore ces paroles.",
    };

    const user = JSON.stringify({
      paroles_actuelles: input.lyrics,
      instruction: instructionMap[input.instruction],
    });

    const json = await callClaudeJson({
      apiKey: this.apiKey(),
      system: LYRICS_SYSTEM_PROMPT,
      user: `Réécris ces paroles selon l'instruction:\n${user}`,
    });

    const sections = sectionsFromRaw(json.sections);
    return {
      title: String(json.title ?? input.lyrics.title),
      language: String(json.language ?? input.lyrics.language),
      sections,
      fullText: sections.map((s) => s.text).join("\n\n"),
    };
  }

  async cleanupStory(input: StoryCleanupInput): Promise<StoryCleanupResult> {
    const json = await callClaudeJson({
      apiKey: this.apiKey(),
      system: `Tu nettoies des transcriptions vocales brutes (hésitations, répétitions) en une histoire claire,
sans rien inventer. Tu identifies aussi l'émotion dominante et les faits clés.
Format JSON: { "cleanedStory": string, "detectedEmotion": string|null,
"extractedFacts": { "recipientName": string|null, "relationship": string|null, "keyMoments": string[] } }`,
      user: input.rawTranscript,
    });

    const facts = (json.extractedFacts ?? {}) as Record<string, unknown>;
    return {
      cleanedStory: String(json.cleanedStory ?? input.rawTranscript),
      detectedEmotion: json.detectedEmotion as StoryCleanupResult["detectedEmotion"],
      extractedFacts: {
        recipientName: facts.recipientName as string | undefined,
        relationship: facts.relationship as string | undefined,
        keyMoments: Array.isArray(facts.keyMoments) ? (facts.keyMoments as string[]) : undefined,
      },
    };
  }
}
