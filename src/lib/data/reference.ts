import { createClient } from "@/lib/supabase/server";

export interface OccasionRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface MusicStyleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface EmotionRow {
  id: string;
  slug: string;
  name: string;
}

export interface VoiceRow {
  id: string;
  slug: string;
  name: string;
  gender: "masculine" | "feminine";
  category: string;
}

export interface CountryRow {
  code: string;
  name: string;
}

// Miroir du seed SQL (0001_base_schema.sql) — utilisé tant qu'aucun projet Supabase n'est
// connecté en local, pour que la landing page et le tunnel de création restent navigables.
const FALLBACK_OCCASIONS: OccasionRow[] = [
  { id: "anniversaire", slug: "anniversaire", name: "Anniversaire", description: null, icon: "Cake" },
  { id: "amour", slug: "amour", name: "Déclaration d'amour", description: null, icon: "Heart" },
  { id: "mariage", slug: "mariage", name: "Mariage", description: null, icon: "Gem" },
  { id: "naissance", slug: "naissance", name: "Naissance", description: null, icon: "Baby" },
  { id: "maman", slug: "maman", name: "Pour maman", description: null, icon: "Flower2" },
  { id: "papa", slug: "papa", name: "Pour papa", description: null, icon: "Award" },
  { id: "hommage", slug: "hommage", name: "Hommage", description: null, icon: "Flame" },
  { id: "merci", slug: "merci", name: "Merci", description: null, icon: "HandHeart" },
  { id: "reussite", slug: "reussite", name: "Réussite", description: null, icon: "Trophy" },
  { id: "gospel", slug: "gospel", name: "Gospel", description: null, icon: "Church" },
  { id: "demande-mariage", slug: "demande-mariage", name: "Demande en mariage", description: null, icon: "Gem" },
  { id: "entreprise", slug: "entreprise", name: "Entreprise", description: null, icon: "Briefcase" },
];

const FALLBACK_MUSIC_STYLES: MusicStyleRow[] = [
  { id: "afrobeat", slug: "afrobeat", name: "Afrobeat", description: "Rythme chaloupé, cuivres, énergie positive" },
  { id: "coupe-decale", slug: "coupe-decale", name: "Coupé-Décalé", description: "Festif, ivoirien, fait danser" },
  { id: "zouglou", slug: "zouglou", name: "Zouglou", description: "Chœurs, percussions, esprit de groupe" },
  { id: "gospel-africain", slug: "gospel-africain", name: "Gospel africain", description: "Chorale, spiritualité, puissance vocale" },
  { id: "makossa", slug: "makossa", name: "Makossa", description: "Groove camerounais, basse ronde" },
  { id: "amapiano", slug: "amapiano", name: "Amapiano", description: "Log drum, ambiance sud-africaine moderne" },
  { id: "rnb", slug: "rnb", name: "R&B", description: "Voix soul, tempo doux, très émotionnel" },
  { id: "acoustique", slug: "acoustique", name: "Acoustique", description: "Guitare/piano, intime et sincère" },
];

const FALLBACK_EMOTIONS: EmotionRow[] = [
  { id: "emotionnel", slug: "emotionnel", name: "Émotionnel" },
  { id: "romantique", slug: "romantique", name: "Romantique" },
  { id: "joyeux", slug: "joyeux", name: "Joyeux" },
  { id: "festif", slug: "festif", name: "Festif" },
  { id: "inspirant", slug: "inspirant", name: "Inspirant" },
  { id: "spirituel", slug: "spirituel", name: "Spirituel" },
  { id: "nostalgique", slug: "nostalgique", name: "Nostalgique" },
];

const FALLBACK_VOICES: VoiceRow[] = [
  { id: "homme-chaleureux", slug: "homme-chaleureux", name: "Homme chaleureux", gender: "masculine", category: "chaleureuse" },
  { id: "homme-puissant", slug: "homme-puissant", name: "Homme puissant", gender: "masculine", category: "puissante" },
  { id: "femme-douce", slug: "femme-douce", name: "Femme douce", gender: "feminine", category: "douce" },
  { id: "femme-emotionnelle", slug: "femme-emotionnelle", name: "Femme émotionnelle", gender: "feminine", category: "emotionnelle" },
];

const FALLBACK_COUNTRIES: CountryRow[] = [
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "BJ", name: "Bénin" },
  { code: "TG", name: "Togo" },
  { code: "SN", name: "Sénégal" },
  { code: "CM", name: "Cameroun" },
  { code: "BF", name: "Burkina Faso" },
  { code: "ML", name: "Mali" },
  { code: "GA", name: "Gabon" },
  { code: "CD", name: "RDC" },
];

export async function getOccasions(): Promise<OccasionRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("occasions")
      .select("id, slug, name, description, icon")
      .eq("active", true)
      .order("sort_order");
    if (error || !data || data.length === 0) return FALLBACK_OCCASIONS;
    return data;
  } catch {
    return FALLBACK_OCCASIONS;
  }
}

export async function getMusicStyles(): Promise<MusicStyleRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("music_styles")
      .select("id, slug, name, description")
      .eq("active", true)
      .order("sort_order");
    if (error || !data || data.length === 0) return FALLBACK_MUSIC_STYLES;
    return data;
  } catch {
    return FALLBACK_MUSIC_STYLES;
  }
}

export async function getEmotions(): Promise<EmotionRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("emotions")
      .select("id, slug, name")
      .eq("active", true)
      .order("sort_order");
    if (error || !data || data.length === 0) return FALLBACK_EMOTIONS;
    return data;
  } catch {
    return FALLBACK_EMOTIONS;
  }
}

export async function getVoices(): Promise<VoiceRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voices")
      .select("id, slug, name, gender, category")
      .eq("active", true)
      .order("sort_order");
    if (error || !data || data.length === 0) return FALLBACK_VOICES;
    return data as VoiceRow[];
  } catch {
    return FALLBACK_VOICES;
  }
}

export async function getCountries(): Promise<CountryRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("countries")
      .select("code, name")
      .eq("active", true)
      .order("sort_order");
    if (error || !data || data.length === 0) return FALLBACK_COUNTRIES;
    return data;
  } catch {
    return FALLBACK_COUNTRIES;
  }
}
