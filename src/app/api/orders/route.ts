import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIER_AMOUNTS_XOF: Record<string, number> = {
  basic: 500,
  premium: 1000,
  vip: 2500,
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tier = body?.tier ?? "basic";
  if (!TIER_AMOUNTS_XOF[tier]) {
    return NextResponse.json({ error: "Formule invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Connexion requise pour créer une commande" }, { status: 401 });
  }

  let occasionId: string | null = null;
  if (body?.occasionSlug) {
    const { data: occasion } = await supabase
      .from("occasions")
      .select("id")
      .eq("slug", body.occasionSlug)
      .maybeSingle();
    occasionId = occasion?.id ?? null;
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      occasion_id: occasionId,
      recipient_name: body?.recipientName ?? null,
      tier,
      status: "awaiting_payment",
      amount_xof: TIER_AMOUNTS_XOF[tier],
      currency: "XOF",
      country_code: body?.countryCode ?? process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "CI",
    })
    .select("id, amount_xof, currency, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order });
}
