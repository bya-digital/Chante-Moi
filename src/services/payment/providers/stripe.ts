import "server-only";
import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentVerificationResult,
} from "../types";
import { PaymentProviderError } from "../types";

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Provider international (carte bancaire), utile pour la diaspora hors zone Mobile Money.
 * API Stripe Checkout Sessions — stable et bien documentée, implémentation directe via fetch
 * pour éviter une dépendance SDK. Vérifier STRIPE_WEBHOOK_SECRET avant mise en prod (signature
 * du webhook non vérifiée ici tant que le SDK stripe n'est pas ajouté pour stripe.webhooks.constructEvent).
 */
function mapStripeStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case "complete":
    case "paid":
      return "SUCCESS";
    case "expired":
      return "CANCELLED";
    case "open":
      return "PENDING";
    default:
      return "PENDING";
  }
}

export class StripeProvider implements PaymentProvider {
  readonly id = "stripe";
  readonly displayName = "Stripe (carte bancaire)";
  readonly supportedCountries = ["*"];
  readonly supportedMethods: PaymentMethod[] = ["card"];

  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new PaymentProviderError(this.id, "STRIPE_SECRET_KEY manquant");

    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][product_data][name]": input.description,
      "line_items[0][price_data][unit_amount]": String(Math.round(input.amount)),
      "line_items[0][quantity]": "1",
      success_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.orderId,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
    });

    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };

    if (!res.ok || !data.id) {
      throw new PaymentProviderError(this.id, `Échec création session: ${data.error?.message ?? res.status}`);
    }

    return {
      providerId: this.id,
      providerReference: data.id,
      checkoutUrl: data.url,
      status: "INITIATED",
    };
  }

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new PaymentProviderError(this.id, "STRIPE_SECRET_KEY manquant");

    const res = await fetch(`${STRIPE_API}/checkout/sessions/${providerReference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      payment_status?: string;
      amount_total?: number;
      currency?: string;
    };

    if (!res.ok) throw new PaymentProviderError(this.id, `Échec vérification: HTTP ${res.status}`);

    return {
      providerReference,
      status: mapStripeStatus(data.payment_status === "paid" ? "paid" : data.status),
      amount: data.amount_total ?? 0,
      currency: (data.currency ?? "usd").toUpperCase(),
      rawPayload: data,
    };
  }

  async parseWebhook(payload: unknown): Promise<PaymentVerificationResult> {
    // TODO avant prod: vérifier la signature Stripe-Signature avec STRIPE_WEBHOOK_SECRET
    // (nécessite le SDK stripe pour stripe.webhooks.constructEvent — non ajouté pour l'instant
    // afin de ne pas alourdir les dépendances tant qu'aucune clé réelle n'est configurée).
    const event = payload as { data?: { object?: { id?: string } } };
    const sessionId = event.data?.object?.id;
    if (!sessionId) throw new PaymentProviderError(this.id, "Webhook Stripe invalide");
    return this.verifyPayment(sessionId);
  }
}
