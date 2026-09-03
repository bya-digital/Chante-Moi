/**
 * Indice de style vocal par pays — ajouté au prompt du moteur musical pour que la manière de
 * chanter (accent, inflexions) évoque le pays du client, pas seulement le genre musical choisi.
 * Volontairement rattaché aux courants musicaux réels du pays (déjà présents dans le seed
 * music_styles : coupé-décalé/zouglou=CI, mbalax=SN, makossa=CM, rumba=CD, wassoulou=ML) plutôt
 * qu'à un stéréotype générique — ça donne au modèle un ancrage musical concret à suivre.
 * À affiner une fois de vraies générations écoutées (voir src/services/music/README.md).
 */
const VOCAL_INTONATION_BY_COUNTRY: Record<string, string> = {
  CI: "intonation et accent ivoiriens, phrasé à la manière du zouglou et du coupé-décalé",
  BJ: "intonation et accent béninois",
  TG: "intonation et accent togolais",
  SN: "intonation et accent sénégalais, phrasé à la manière du mbalax",
  CM: "intonation et accent camerounais, phrasé à la manière du makossa",
  BF: "intonation et accent burkinabè",
  ML: "intonation et accent maliens, phrasé à la manière du wassoulou",
  GA: "intonation et accent gabonais",
  CD: "intonation et accent congolais (RDC), phrasé à la manière de la rumba congolaise",
};

const DEFAULT_INTONATION = "intonation ouest-africaine francophone";

export function vocalIntonationForCountry(countryCode: string | undefined): string {
  if (!countryCode) return DEFAULT_INTONATION;
  return VOCAL_INTONATION_BY_COUNTRY[countryCode.toUpperCase()] ?? DEFAULT_INTONATION;
}
