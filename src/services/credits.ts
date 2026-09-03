import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ledger de crédits (sections 13/17/18/54) : credit_transactions est source de vérité, jamais de
 * colonne "balance" dénormalisée. Le solde est toujours recalculé par somme des mouvements
 * (purchase/consumption/refund/gift/expiration).
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("credit_transactions").select("amount").eq("user_id", userId);
  if (error) throw new Error(`Impossible de calculer le solde de crédits: ${error.message}`);
  return (data ?? []).reduce((total, row) => total + row.amount, 0);
}

/**
 * Débite 1 crédit pour démarrer une génération (1 crédit = 1 génération). Refuse si le solde est
 * insuffisant plutôt que de laisser le solde passer négatif — l'appelant ne doit pas lancer le
 * provider musical si false est renvoyé.
 */
export async function consumeCredit(params: { userId: string; songId: string }): Promise<boolean> {
  const { userId, songId } = params;
  const balance = await getCreditBalance(userId);
  if (balance < 1) return false;

  const admin = createAdminClient();
  const { error } = await admin.from("credit_transactions").insert({
    user_id: userId,
    type: "consumption",
    amount: -1,
    song_id: songId,
  });
  if (error) {
    console.error("[credits] échec débit consommation:", error.message);
    return false;
  }
  return true;
}

/**
 * Recrédite 1 crédit quand une génération déjà débitée se termine en échec (FAILED/CANCELLED) ou
 * ne démarre jamais après débit — l'utilisateur ne doit jamais payer pour une chanson non livrée.
 */
export async function refundCredit(params: { userId: string; songId: string }): Promise<void> {
  const { userId, songId } = params;
  const admin = createAdminClient();
  const { error } = await admin.from("credit_transactions").insert({
    user_id: userId,
    type: "refund",
    amount: 1,
    song_id: songId,
  });
  if (error) console.error("[credits] échec crédit remboursement:", error.message);
}
