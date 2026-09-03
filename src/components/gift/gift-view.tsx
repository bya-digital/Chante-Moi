"use client";

import { Heart, Music2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";

interface GiftViewProps {
  giftPage: { slug: string; recipient_name: string | null; photo_url: string | null; message: string | null };
  song: { title: string | null; audio_url: string | null; cover_url: string | null; duration_seconds: number | null };
  lyricsText: string | null;
}

export function GiftView({ giftPage, song, lyricsText }: GiftViewProps) {
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: song.title ?? "Une chanson pour toi", url }).catch(() => {});
      return;
    }
    const success = await copyToClipboard(url);
    if (success) toast.success("Lien copié");
    else toast.error("Impossible de copier automatiquement — sélectionnez et copiez le lien manuellement");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -left-20 bottom-40 h-64 w-64 rounded-full bg-primary/20 blur-3xl [animation-delay:2s]"
      />

      <div className="relative mx-auto flex max-w-lg flex-col items-center px-5 py-14 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Music2 className="h-4 w-4" />
        </span>
        <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Un cadeau Chante-Moi</p>

        {giftPage.photo_url && (
          <div
            className="mt-6 h-40 w-40 rounded-full bg-cover bg-center ring-4 ring-primary/20"
            style={{ backgroundImage: `url(${giftPage.photo_url})` }}
          />
        )}

        <h1 className="mt-6 text-balance font-heading text-3xl font-semibold sm:text-4xl">
          Pour {giftPage.recipient_name ?? "toi"} <Heart className="inline h-7 w-7 fill-primary text-primary" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Une chanson créée spécialement pour toi.</p>

        {giftPage.message && (
          <p className="mt-6 rounded-2xl border border-border bg-card/80 p-4 text-sm text-foreground/90 italic">
            &laquo; {giftPage.message} &raquo;
          </p>
        )}

        <div className="mt-8 w-full overflow-hidden rounded-3xl border border-border bg-card shadow-lg shadow-primary/5">
          <div
            className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-primary/20 via-accent/20 to-secondary bg-cover bg-center"
            style={song.cover_url ? { backgroundImage: `url(${song.cover_url})` } : undefined}
          >
            {!song.cover_url && <Music2 className="h-16 w-16 text-primary/40" />}
          </div>
          <div className="p-5">
            <p className="font-heading text-lg font-semibold">{song.title}</p>
            {song.audio_url && <audio controls src={song.audio_url} className="mt-3 w-full" />}
          </div>
        </div>

        <Button size="lg" className="mt-6 rounded-full px-8" onClick={share}>
          <Share2 className="h-4 w-4" /> Partager ce cadeau
        </Button>

        {lyricsText && (
          <details className="mt-8 w-full text-left">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Voir les paroles</summary>
            <p className="mt-3 whitespace-pre-line rounded-xl border border-border bg-secondary/30 p-4 text-sm">
              {lyricsText}
            </p>
          </details>
        )}

        <p className="mt-10 font-heading text-sm italic text-muted-foreground">— Créé avec Chante-Moi</p>
      </div>
    </main>
  );
}
