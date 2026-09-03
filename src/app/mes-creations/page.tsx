import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { CreationsList } from "@/components/creations/creations-list";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mes créations" };

export default async function MesCreationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?next=/mes-creations");

  const { data: songs } = await supabase
    .from("songs")
    .select("id, title, status, cover_url, duration_seconds, is_favorite, created_at, occasions(name)")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-secondary/20">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <h1 className="font-heading text-3xl font-semibold">Mes créations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Toutes les chansons que vous avez créées.</p>
          <div className="mt-8">
            <CreationsList songs={songs ?? []} />
          </div>
        </div>
      </main>
    </>
  );
}
