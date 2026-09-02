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

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";

function mapFlutterwaveStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case "successful":
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export class FlutterwaveProvider implements PaymentProvider {
  readonly id = "flutterwave";
  readonly displayName = "Flutterwave";
  readonly supportedCountries = ["NG", "GH", "KE", "UG", "ZA", "CI", "SN"];
  readonly supportedMethods: PaymentMethod[] = ["card", "mtn_momo", "orange_money"];

  isConfigured(): boolean {
    return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) throw new PaymentProviderError(this.id, "FLUTTERWAVE_SECRET_KEY manquant");

    const res = await fetch(`${FLUTTERWAVE_API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: input.orderId,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.returnUrl,
        customer: { email: input.customerEmail, phonenumber: input.customerPhone },
        customizations: { title: "MeloKado", description: input.description },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };

    if (!res.ok || data.status !== "success") {
      throw new PaymentProviderError(this.id, `Échec initialisation: ${data.message ?? res.status}`);
    }

    return {
      providerId: this.id,
      providerReference: input.orderId,
      checkoutUrl: data.data?.link,
      status: "INITIATED",
    };
  }

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) throw new PaymentProviderError(this.id, "FLUTTERWAVE_SECRET_KEY manquant");

    const res = await fetch(
      `${FLUTTERWAVE_API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerReference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    const data = (await res.json().catch(() => ({}))) as {
      data?: { status?: string; amount?: number; currency?: string };
    };

    if (!res.ok) throw new PaymentProviderError(this.id, `Échec vérification: HTTP ${res.status}`);

    return {
      providerReference,
      status: mapFlutterwaveStatus(data.data?.status),
      amount: data.data?.amount ?? 0,
      currency: data.data?.currency ?? "XOF",
      rawPayload: data,
    };
  }

  async parseWebhook(payload: unknown, headers: Record<string, string>): Promise<PaymentVerificationResult> {
    const secretHash = process.env.FLUTTERWAVE_SECRET_KEY;
    const signature = headers["verif-hash"];
    if (!secretHash || signature !== process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH) {
      // TODO avant prod: définir FLUTTERWAVE_WEBHOOK_SECRET_HASH dans .env (valeur configurée
      // dans le dashboard Flutterwave) — sans ça un webhook ne peut pas être authentifié.
      throw new PaymentProviderError(this.id, "Signature webhook Flutterwave non vérifiable");
    }
    const event = payload as { data?: { tx_ref?: string } };
    const txRef = event.data?.tx_ref;
    if (!txRef) throw new PaymentProviderError(this.id, "Webhook Flutterwave invalide");
    return this.verifyPayment(txRef);
  }
}
