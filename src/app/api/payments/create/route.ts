import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentManager } from "@/services/payment/manager";
import { dbProviderStatusChecker } from "@/services/provider-status";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.orderId) {
    return NextResponse.json({ error: "orderId manquant" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, amount_xof, currency, country_code, tier")
    .eq("id", body.orderId)
    .single();

  if (orderError || !order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.user_id !== user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004";

  try {
    const paymentManager = new PaymentManager(dbProviderStatusChecker());
    const result = await paymentManager.createPaymentIntent(
      {
        orderId: order.id,
        amount: order.amount_xof,
        currency: order.currency,
        countryCode: order.country_code,
        method: body.method,
        description: `MeloKado — commande ${order.tier}`,
        customerEmail: user.email ?? undefined,
        customerPhone: body.customerPhone,
        returnUrl: `${siteUrl}/creer/paiement/retour?order=${order.id}`,
        cancelUrl: `${siteUrl}/creer?order=${order.id}`,
      },
      { countryCode: order.country_code, method: body.method },
    );

    // Enregistrement admin (bypass RLS) — l'utilisateur ne peut pas écrire directement dans
    // payment_attempts (voir policy RLS), c'est le serveur, source de vérité, qui le fait.
    const admin = createAdminClient();
    await admin.from("payment_attempts").insert({
      order_id: order.id,
      provider_id: result.providerId,
      provider_reference: result.providerReference,
      status: result.status,
      amount_xof: order.amount_xof,
      currency: order.currency,
    });

    return NextResponse.json({ checkoutUrl: result.checkoutUrl, providerId: result.providerId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
