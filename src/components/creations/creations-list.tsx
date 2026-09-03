"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, Music2, CircleX } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SongRow {
  id: string;
  title: string | null;
  status: string;
  cover_url: string | null;
  duration_seconds: number | null;
  is_favorite: boolean;
  created_at: string;
  occasions: { name: string } | { name: string }[] | null;
}

function occasionName(v: SongRow["occasions"]): string | null {
  const o = Array.isArray(v) ? v[0] : v;
  return o?.name ?? null;
}

const FILTERS = [
  { id: "toutes", label: "Toutes" },
  { id: "terminees", label: "Terminées" },
  { id: "en_cours", label: "En cours" },
  { id: "favorites", label: "Favorites" },
] as const;

export function CreationsList({ songs }: { songs: SongRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("toutes");

  const filtered = songs.filter((s) => {
    if (filter === "terminees") return s.status === "completed";
    if (filter === "en_cours") return s.status === "processing" || s.status === "queued";
    if (filter === "favorites") return s.is_favorite;
    return true;
  });

  return (
    <div>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.id} value={f.id}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Music2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune création ici pour l&apos;instant.</p>
          <Link href="/creer" className="text-sm font-medium text-primary">
            Créer ma première chanson
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((song) => (
            <Link key={song.id} href={`/creations/${song.id}`}>
              <Card className="overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div
                  className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/15 via-accent/15 to-secondary bg-cover bg-center"
                  style={song.cover_url ? { backgroundImage: `url(${song.cover_url})` } : undefined}
                >
                  {!song.cover_url && <Music2 className="h-8 w-8 text-primary/40" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-sm font-semibold">{song.title ?? "Sans titre"}</p>
                    {song.is_favorite && <Heart className="h-4 w-4 shrink-0 fill-primary text-primary" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{occasionName(song.occasions) ?? "—"}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      variant={song.status === "completed" ? "default" : song.status === "failed" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {song.status === "processing" || song.status === "queued" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : song.status === "failed" ? (
                        <CircleX className="h-3 w-3" />
                      ) : null}
                      {song.status === "completed"
                        ? "Terminée"
                        : song.status === "processing" || song.status === "queued"
                          ? "En cours"
                          : song.status === "failed"
                            ? "Échec"
                            : "Brouillon"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(song.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
