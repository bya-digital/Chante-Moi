import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Coûts & revenus" };

const CATEGORY_LABELS: Record<string, string> = {
  ai_text: "IA texte (paroles)",
  transcription: "Transcription vocale",
  music: "Génération musicale",
  video: "Vidéo",
  storage: "Stockage",
  payment_fees: "Frais de paiement",
};

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function sumByCategory(rows: { category: string; amount_xof: number }[]) {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[row.category] = (totals[row.category] ?? 0) + Number(row.amount_xof);
  }
  return totals;
}

export default async function AdminCoutsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [todayCosts, monthCosts, todayRevenue, monthRevenue] = await Promise.all([
    admin.from("generation_costs").select("category, amount_xof").gte("created_at", startOfDay()),
    admin.from("generation_costs").select("category, amount_xof").gte("created_at", startOfMonth()),
    admin.from("orders").select("amount_xof").eq("status", "paid").gte("updated_at", startOfDay()),
    admin.from("orders").select("amount_xof").eq("status", "paid").gte("updated_at", startOfMonth()),
  ]);

  const todayCostTotals = sumByCategory(todayCosts.data ?? []);
  const monthCostTotals = sumByCategory(monthCosts.data ?? []);
  const todayCostSum = Object.values(todayCostTotals).reduce((a, b) => a + b, 0);
  const monthCostSum = Object.values(monthCostTotals).reduce((a, b) => a + b, 0);
  const todayRevenueSum = (todayRevenue.data ?? []).reduce((a, r) => a + Number(r.amount_xof), 0);
  const monthRevenueSum = (monthRevenue.data ?? []).reduce((a, r) => a + Number(r.amount_xof), 0);

  return (
    <main className="flex-1 bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <AdminNav />
        <h1 className="mt-6 font-heading text-3xl font-semibold">Coûts & revenus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Coûts estimés (section 18/70) — voir src/services/cost-estimates.ts pour la méthode de calcul.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-heading text-lg font-semibold">Aujourd&apos;hui</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Revenus</dt>
                <dd className="font-medium">{todayRevenueSum.toLocaleString("fr-FR")} FCFA</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Coût variable</dt>
                <dd className="font-medium">{todayCostSum.toLocaleString("fr-FR")} FCFA</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium">Marge brute estimée</dt>
                <dd className="font-semibold text-primary">
                  {(todayRevenueSum - todayCostSum).toLocaleString("fr-FR")} FCFA
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-heading text-lg font-semibold">Ce mois-ci</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Revenus</dt>
                <dd className="font-medium">{monthRevenueSum.toLocaleString("fr-FR")} FCFA</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Coût variable</dt>
                <dd className="font-medium">{monthCostSum.toLocaleString("fr-FR")} FCFA</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium">Marge brute estimée</dt>
                <dd className="font-semibold text-primary">
                  {(monthRevenueSum - monthCostSum).toLocaleString("fr-FR")} FCFA
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="font-heading text-lg font-semibold">Coût par catégorie (ce mois-ci)</h2>
          <Card className="mt-4 divide-y divide-border p-0">
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <div key={cat} className="flex justify-between p-4 text-sm">
                <span>{CATEGORY_LABELS[cat]}</span>
                <span className="font-medium">{(monthCostTotals[cat] ?? 0).toLocaleString("fr-FR")} FCFA</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </main>
  );
}
