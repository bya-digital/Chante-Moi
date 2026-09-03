"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  Share2,
  Heart,
  RefreshCw,
  Trash2,
  Gift,
  Loader2,
  Sparkles,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

interface SongRow {
  id: string;
  title: string | null;
  status: string;
  audio_url: string | null;
  cover_url: string | null;
  duration_seconds: number | null;
  recipient_name: string | null;
  is_favorite: boolean;
  language: string;
  occasions: { name: string } | { name: string }[] | null;
  emotions: { name: string } | { name: string }[] | null;
  music_styles: { name: string; slug: string } | { name: string; slug: string }[] | null;
  voices: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

interface LyricsRow {
  title: string;
  full_text: string;
  sections: { kind: string; index: number; text: string }[];
  language: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  lyrics_ready: "Paroles prêtes",
  queued: "En file d'attente",
  processing: "Composition en cours",
  completed: "Terminée",
  failed: "Échec",
  cancelled: "Supprimée",
};

export function SongResult({
  initialSong,
  initialLyrics,
  giftSlug,
}: {
  initialSong: SongRow;
  initialLyrics: LyricsRow | null;
  giftSlug: string | null;
}) {
  const router = useRouter();
  const [song, setSong] = useState(initialSong);
  const [lyrics] = useState(initialLyrics);
  const [regenerating, setRegenerating] = useState(false);
  const [creatingGift, setCreatingGift] = useState(false);
  const [slug, setSlug] = useState(giftSlug);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const musicStyle = one(song.music_styles);
  const emotion = one(song.emotions);
  const occasion = one(song.occasions);
  const voice = one(song.voices);

  useEffect(() => {
    if (song.status !== "processing" && song.status !== "queued") return;
    const supabase = createClient();

    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("songs")
        .select(
          "id, title, status, audio_url, cover_url, duration_seconds, recipient_name, is_favorite, language, occasions(name), emotions(name), music_styles(name, slug), voices(name, slug)",
        )
        .eq("id", song.id)
        .maybeSingle();
      if (data && (data.status === "completed" || data.status === "failed")) {
        setSong(data as unknown as SongRow);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [song.status, song.id]);

  async function toggleFavorite() {
    const supabase = createClient();
    const next = !song.is_favorite;
    setSong((s) => ({ ...s, is_favorite: next }));
    const { error } = await supabase.from("songs").update({ is_favorite: next }).eq("id", song.id);
    if (error) {
      setSong((s) => ({ ...s, is_favorite: !next }));
      toast.error("Impossible de mettre à jour les favoris");
    }
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, musicStyle: musicStyle?.slug, emotion: emotion?.name, voiceType: voice?.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la régénération");
      setSong((s) => ({ ...s, status: data.status ?? "processing", audio_url: data.audioUrl ?? s.audio_url }));
      toast.success("Nouvelle génération lancée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setRegenerating(false);
    }
  }

  async function createGiftPage() {
    setCreatingGift(true);
    try {
      const supabase = createClient();
      const newSlug = `${(song.title ?? "chanson").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${song.id.slice(0, 6)}`;
      const { error } = await supabase.from("gift_pages").insert({
        song_id: song.id,
        slug: newSlug,
        recipient_name: song.recipient_name,
      });
      if (error) throw error;
      setSlug(newSlug);
      toast.success("Page cadeau créée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la création de la page cadeau");
    } finally {
      setCreatingGift(false);
    }
  }

  async function softDelete() {
    const supabase = createClient();
    const { error } = await supabase.from("songs").update({ status: "cancelled" }).eq("id", song.id);
    if (error) {
      toast.error("Échec de la suppression");
      return;
    }
    router.push("/mes-creations");
  }

  async function share() {
    const url = slug ? `${window.location.origin}/gift/${slug}` : window.location.href;
    if (navigator.share) {
      navigator.share({ title: song.title ?? "Ma chanson Chante-Moi", url }).catch(() => {});
      return;
    }
    const success = await copyToClipboard(url);
    if (success) toast.success("Lien copié");
    else toast.error("Impossible de copier automatiquement — sélectionnez et copiez le lien manuellement");
  }

  function shareWhatsApp() {
    const url = slug ? `${window.location.origin}/gift/${slug}` : window.location.href;
    const text = encodeURIComponent(`J'ai créé une chanson pour toi avec Chante-Moi 🎵 ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Card className="overflow-hidden p-0">
        <div
          className={cn(
            "flex aspect-square w-full items-center justify-center bg-gradient-to-br from-primary/20 via-accent/20 to-secondary",
            song.cover_url && "bg-cover bg-center",
          )}
          style={song.cover_url ? { backgroundImage: `url(${song.cover_url})` } : undefined}
        >
          {!song.cover_url && <Sparkles className="h-16 w-16 text-primary/40" />}
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold">{song.title ?? "Ma chanson"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {[occasion?.name, emotion?.name, musicStyle?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleFavorite} aria-label="Favori">
              <Heart className={cn("h-5 w-5", song.is_favorite && "fill-primary text-primary")} />
            </Button>
          </div>

          <Badge variant="secondary" className="mt-3">
            {STATUS_LABEL[song.status] ?? song.status}
          </Badge>

          {(song.status === "processing" || song.status === "queued") && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-secondary/40 p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Votre chanson prend vie... quelques instants.</p>
            </div>
          )}

          {song.status === "failed" && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <CircleX className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">La génération a échoué. Vous pouvez réessayer.</p>
              <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Réessayer
              </Button>
            </div>
          )}

          {song.status === "completed" && song.audio_url && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CircleCheck className="h-4 w-4" /> Chanson prête
              </div>
              <audio controls src={song.audio_url} className="w-full" />

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="outline" size="sm" asChild>
                  <a href={song.audio_url} download>
                    <Download className="h-4 w-4" /> MP3
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={share}>
                  <Share2 className="h-4 w-4" /> Partager
                </Button>
                <Button variant="outline" size="sm" onClick={shareWhatsApp}>
                  WhatsApp
                </Button>
                {!slug ? (
                  <Button variant="outline" size="sm" onClick={createGiftPage} disabled={creatingGift}>
                    {creatingGift ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    Page cadeau
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/gift/${slug}`}>
                      <Gift className="h-4 w-4" /> Voir le cadeau
                    </Link>
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={regenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Nouvelle version
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={softDelete}>
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
              </div>
            </div>
          )}

          {lyrics && (
            <div className="mt-8">
              <h2 className="font-heading text-lg font-semibold">Paroles</h2>
              <div className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm whitespace-pre-line">
                {lyrics.sections
                  .slice()
                  .sort((a, b) => a.index - b.index)
                  .map((s, i) => (
                    <p key={i}>{s.text}</p>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
