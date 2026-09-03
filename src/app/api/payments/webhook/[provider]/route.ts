import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PaymentManager } from "@/services/payment/manager";
import { triggerSongGeneration } from "@/services/music/trigger";
import { notifyUser } from "@/services/notify-user";

/**
 * Un paiement n'est JAMAIS considéré réussi sur la seule base du webhook brut (section 16) :
 * parseWebhook() de chaque provider revérifie activement le statut auprès du provider avant de
 * retourner un résultat. Idempotence (section 53) : si l'attempt est déjà SUCCESS, on ne
 * recrédite rien.
 */
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const headers = Object.fromEntries(request.headers.entries());

  let payload: unknown;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await request.json().catch(() => ({}));
  } else {
    const form = await request.formData().catch(() => null);
    payload = form ? Object.fromEntries(form.entries()) : {};
  }

  const admin = createAdminClient();

  try {
    const paymentManager = new PaymentManager();
    const result = await paymentManager.parseWebhook(provider, payload, headers);

    const { data: attempt } = await admin
      .from("payment_attempts")
      .select("id, order_id, status")
      .eq("provider_id", provider)
      .eq("provider_reference", result.providerReference)
      .maybeSingle();

    if (!attempt) {
      await admin.from("provider_logs").insert({
        provider_type: "payment",
        provider_id: provider,
        action: "webhook",
        success: false,
        error_message: "provider_reference inconnu — possible replay ou commande jamais initiée",
      });
      return NextResponse.json({ ok: true });
    }

    if (attempt.status === "SUCCESS") {
      // Idempotence : déjà traité, ne rien recréditer.
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    await admin
      .from("payment_attempts")
      .update({ status: result.status, raw_payload: result.rawPayload ?? null })
      .eq("id", attempt.id);

    if (result.status === "SUCCESS") {
      await admin.from("orders").update({ status: "paid" }).eq("id", attempt.order_id);

      const { data: order } = await admin.from("orders").select("user_id").eq("id", attempt.order_id).single();
      if (order) {
        await admin.from("credit_transactions").insert({
          user_id: order.user_id,
          type: "purchase",
          amount: 1,
          order_id: attempt.order_id,
        });
        await notifyUser({
          userId: order.user_id,
          event: "payment_confirmed",
          subject: "Paiement confirmé",
          message: "Votre paiement est confirmé, votre chanson est en cours de création.",
        });
      }

      const { data: song } = await admin.from("songs").select("id").eq("order_id", attempt.order_id).maybeSingle();
      if (song) {
        // Best-effort : ne bloque jamais la confirmation du webhook si la génération échoue —
        // le paiement reste valide, la génération peut être relancée depuis l'admin/l'historique.
        await triggerSongGeneration(song.id);
      }
    }

    await admin.from("provider_logs").insert({
      provider_type: "payment",
      provider_id: provider,
      action: "webhook",
      success: true,
      order_id: attempt.order_id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await admin.from("provider_logs").insert({
      provider_type: "payment",
      provider_id: provider,
      action: "webhook",
      success: false,
      error_message: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
