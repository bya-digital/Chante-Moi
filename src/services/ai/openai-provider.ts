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

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

async function callOpenAIJson(params: {
  apiKey: string;
  system: string;
  user: string;
  model?: string;
}): Promise<Record<string, unknown>> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model ?? DEFAULT_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.85,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new AIProviderError("openai", `HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AIProviderError("openai", "Réponse vide du modèle");

  try {
    return JSON.parse(content);
  } catch (cause) {
    throw new AIProviderError("openai", "Réponse non-JSON du modèle", cause);
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
Réponds UNIQUEMENT en JSON avec ce format strict:
{
  "title": "titre court et percutant",
  "language": "fr",
  "sections": [
    { "kind": "intro" | "couplet" | "pre_refrain" | "refrain" | "pont" | "outro", "text": "paroles de la section" }
  ]
}
Règles:
- N'invente pas de faits qui contredisent l'histoire fournie.
- Adapte le vocabulaire et le rythme au style musical et à l'émotion demandés.
- Le refrain doit être mémorable et répétable.
- Ne force pas une structure complète (pont, pré-refrain) si le style ne s'y prête pas.
- Écris en respectant la langue demandée.`;

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI (GPT)";

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  private apiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new AIProviderError(this.id, "OPENAI_API_KEY manquant");
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

    const json = await callOpenAIJson({
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

    const json = await callOpenAIJson({
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
    const json = await callOpenAIJson({
      apiKey: this.apiKey(),
      system: `Tu nettoies des transcriptions vocales brutes (hésitations, répétitions) en une histoire claire,
sans rien inventer. Tu identifies aussi l'émotion dominante et les faits clés.
Réponds en JSON: { "cleanedStory": string, "detectedEmotion": string|null,
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
