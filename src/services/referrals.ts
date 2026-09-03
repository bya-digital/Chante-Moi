import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

function generateCode(userId: string): string {
  return `MK${userId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Récupère le code de parrainage de l'utilisateur, le crée s'il n'existe pas encore. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("referrals")
    .select("code")
    .eq("referrer_user_id", userId)
    .maybeSingle();
  if (existing) return existing.code;

  const code = generateCode(userId);
  const { data, error } = await admin
    .from("referrals")
    .insert({ referrer_user_id: userId, code })
    .select("code")
    .single();

  if (error) {
    // Code déjà pris (collision rare) — retente avec un suffixe aléatoire.
    const fallbackCode = `${code}${Math.floor(Math.random() * 100)}`;
    const { data: retry } = await admin
      .from("referrals")
      .insert({ referrer_user_id: userId, code: fallbackCode })
      .select("code")
      .single();
    return retry?.code ?? fallbackCode;
  }

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
