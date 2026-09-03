import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SongResult } from "@/components/creations/song-result";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Votre chanson" };

export default async function CreationResultPage({ params }: PageProps<"/creations/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: song } = await supabase
    .from("songs")
    .select(
      "id, title, status, audio_url, cover_url, duration_seconds, recipient_name, is_favorite, language, occasions(name), emotions(name), music_styles(name, slug), voices(name, slug)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!song) notFound();

  const { data: lyrics } = await supabase
    .from("lyrics")
    .select("title, full_text, sections, language")
    .eq("song_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: giftPage } = await supabase
    .from("gift_pages")
    .select("slug")
    .eq("song_id", id)
    .maybeSingle();

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-secondary/20">
        <SongResult initialSong={song} initialLyrics={lyrics} giftSlug={giftPage?.slug ?? null} />
      </main>
    </>
  );
}
