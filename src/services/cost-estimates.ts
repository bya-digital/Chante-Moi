/**
 * Estimations de coût (section 18/70) — volontairement approximatives et documentées comme
 * telles. Aucun de ces providers ne renvoie de coût exact par appel dans ses réponses actuelles
 * (OpenAI/Anthropic/Whisper/Deepgram renvoient de l'usage token/durée mais pas un prix ; on
 * approxime plutôt que de laisser generation_costs vide). Taux septembre 2026, ~600 XOF/USD —
 * à recalibrer si les tarifs providers changent.
 */

/** ~1500 tokens en+out pour une génération de paroles gpt-4o-mini/claude-sonnet, coût réel très faible */
export const AI_TEXT_COST_XOF = 5;

/** Whisper/Deepgram ~ 0,006 $/min, on arrondit pour une histoire racontée de ~1-2 min */
export const TRANSCRIPTION_COST_XOF = 5;

/** ElevenLabs Music ~900 crédits/min au tarif de base, ~0,0002 $/crédit -> ~0,18 $/min -> ~110 XOF/min */
const MUSIC_COST_XOF_PER_MINUTE = 110;

export function musicCostXofEstimate(durationSeconds: number | undefined): number {
  if (!durationSeconds) return MUSIC_COST_XOF_PER_MINUTE; // ordre de grandeur si durée inconnue
  return Math.round((durationSeconds / 60) * MUSIC_COST_XOF_PER_MINUTE);
}
