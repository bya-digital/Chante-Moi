import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProvidersTable } from "@/components/admin/providers-table";
import { AdminNav } from "@/components/admin/admin-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Administration" };

const STAT_LABELS: Record<string, string> = {
  users: "Utilisateurs",
  orders: "Commandes",
  paidOrders: "Commandes payées",
  songs: "Chansons",
  completedSongs: "Chansons terminées",
};

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ count: users }, { count: orders }, { count: paidOrders }, { count: songs }, { count: completedSongs }] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("orders").select("id", { count: "exact", head: true }),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
      admin.from("songs").select("id", { count: "exact", head: true }),
      admin.from("songs").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);

  const { data: providers } = await admin
    .from("provider_configs")
    .select("id, provider_type, display_name, active, priority, error_count, request_count, last_error")
    .order("provider_type")
    .order("priority");

  const { data: recentOrders } = await admin
    .from("orders")
    .select("id, tier, status, amount_xof, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const stats = { users, orders, paidOrders, songs, completedSongs };

  return (
    <main className="flex-1 bg-secondary/20">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <AdminNav />
        <h1 className="mt-6 font-heading text-3xl font-semibold">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue d&apos;ensemble MeloKado.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Object.entries(stats).map(([key, value]) => (
            <Card key={key} className="p-4">
              <p className="text-2xl font-semibold">{value ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{STAT_LABELS[key]}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="font-heading text-xl font-semibold">Providers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kill switch et priorité — un provider désactivé n&apos;est plus jamais utilisé, l&apos;app bascule sur le suivant.
          </p>
          <div className="mt-4">
            <ProvidersTable providers={providers ?? []} />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-heading text-xl font-semibold">Dernières commandes</h2>
          <Card className="mt-4 divide-y divide-border overflow-hidden p-0">
            {(recentOrders ?? []).length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Aucune commande pour l&apos;instant.</p>
            )}
            {(recentOrders ?? []).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{o.tier}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{o.amount_xof} FCFA</span>
                  <Badge variant={o.status === "paid" ? "default" : "secondary"}>{o.status}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </main>
  );
}
