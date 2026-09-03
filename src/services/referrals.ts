import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

function generateCode(userId: string): string {
  return `MK${userId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/**
 * Récupère le code de parrainage de l'utilisateur, le crée s'il n'existe pas encore.
 *
 * Écrit pour être sûr même si deux appels concurrents arrivent en même temps (React peut
 * invoquer un Server Component deux fois en dev, un utilisateur peut recharger vite) : on tente
 * l'insert et on ignore l'erreur de conflit plutôt que de faire un "lookup puis insert" qui a un
 * trou entre les deux (déjà vécu : 6 lignes créées pour le même utilisateur en rechargeant vite).
 * La contrainte unique sur referrals.referrer_user_id est ce qui rend ça sûr — sans elle, ce
 * code réintroduirait le même bug.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const admin = createAdminClient();
  const code = generateCode(userId);

  // Erreur de conflit attendue et ignorée si une ligne existe déjà pour cet utilisateur ou ce code.
  await admin.from("referrals").insert({ referrer_user_id: userId, code });

  const { data, error } = await admin
    .from("referrals")
    .select("code")
    .eq("referrer_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) throw new Error(`Impossible de récupérer le code de parrainage: ${error?.message}`);
  return data.code;
}

/**
 * Récompense le parrain lors du premier paiement réussi d'un filleul (section 33). Best-effort,
 * ne bloque jamais le webhook de paiement. Anti-fraude minimal : un seul referral_rewards par
 * filleul (contrainte applicative, pas de double récompense même si le webhook est rejoué).
 */
export async function rewardReferrerIfEligible(newPayingUserId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by_code")
    .eq("id", newPayingUserId)
    .maybeSingle();
  if (!profile?.referred_by_code) return;

  const { data: referral } = await admin
    .from("referrals")
    .select("id, referrer_user_id")
    .eq("code", profile.referred_by_code)
    .maybeSingle();
  if (!referral || referral.referrer_user_id === newPayingUserId) return;

  const { data: existingReward } = await admin
    .from("referral_rewards")
    .select("id")
    .eq("referral_id", referral.id)
    .eq("referred_user_id", newPayingUserId)
    .maybeSingle();
  if (existingReward) return; // déjà récompensé — pas de doublon

  await admin.from("referral_rewards").insert({
    referral_id: referral.id,
    referred_user_id: newPayingUserId,
    reward_type: "credit",
    amount: 1,
    status: "granted",
  });

  await admin.from("credit_transactions").insert({
    user_id: referral.referrer_user_id,
    type: "gift",
    amount: 1,
  });
}
