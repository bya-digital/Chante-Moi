import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateReferralCode } from "@/services/referrals";
import { ReferralShare } from "@/components/referral-share";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Parrainage" };

export default async function ParrainagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/parrainage");

  const code = await getOrCreateReferralCode(user.id);

  const { data: referral } = await supabase.from("referrals").select("id").eq("referrer_user_id", user.id).single();
  const { data: rewards } = await supabase
    .from("referral_rewards")
    .select("id, amount, status, created_at")
    .eq("referral_id", referral?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-secondary/20">
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
          <h1 className="font-heading text-3xl font-semibold">Parrainage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Partagez votre lien — quand un filleul achète sa première chanson, vous recevez 1 crédit offert.
          </p>

          <div className="mt-6">
            <ReferralShare code={code} />
          </div>

          <div className="mt-8">
            <h2 className="font-heading text-lg font-semibold">Récompenses</h2>
            <Card className="mt-3 divide-y divide-border p-0">
              {(rewards ?? []).length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Aucune récompense pour l&apos;instant.</p>
              )}
              {(rewards ?? []).map((r) => (
                <div key={r.id} className="flex justify-between p-4 text-sm">
                  <span>{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                  <span className="font-medium">+{r.amount} crédit</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
