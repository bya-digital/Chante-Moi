import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GiftView } from "@/components/gift/gift-view";

export async function generateMetadata({ params }: PageProps<"/gift/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Pour ${slug} — MeloKado`,
    openGraph: { title: "Une chanson créée spécialement pour toi ❤️" },
  };
}

export default async function GiftPage({ params }: PageProps<"/gift/[slug]">) {
  const { slug } = await params;

  // gift_pages est en lecture publique (RLS), mais songs ne l'est pas (l'utilisateur doit
  // rester propriétaire de ses créations partout ailleurs) — on utilise donc le client admin
  // ici, uniquement pour lire le sous-ensemble de colonnes sûres à exposer publiquement,
  // plutôt que d'ouvrir une policy RLS publique sur toute la table songs.
  const supabase = await createClient();
  const { data: giftPage } = await supabase
    .from("gift_pages")
    .select("slug, recipient_name, photo_url, message, song_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!giftPage) notFound();

  const admin = createAdminClient();
  const { data: song } = await admin
    .from("songs")
    .select("title, audio_url, cover_url, duration_seconds, status")
    .eq("id", giftPage.song_id)
    .maybeSingle();

  if (!song || song.status !== "completed") notFound();

  const { data: lyrics } = await admin
    .from("lyrics")
    .select("full_text")
    .eq("song_id", giftPage.song_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return <GiftView giftPage={giftPage} song={song} lyricsText={lyrics?.full_text ?? null} />;
}
