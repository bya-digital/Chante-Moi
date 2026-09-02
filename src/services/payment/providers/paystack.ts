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

const PAYSTACK_API = "https://api.paystack.co";

/** API Paystack Transactions — bien documentée. Vérifier support devise XOF selon le pays avant activation. */
function mapPaystackStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case "success":
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "abandoned":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export class PaystackProvider implements PaymentProvider {
  readonly id = "paystack";
  readonly displayName = "Paystack";
  readonly supportedCountries = ["NG", "GH", "ZA", "KE"];
  readonly supportedMethods: PaymentMethod[] = ["card"];

  isConfigured(): boolean {
    return Boolean(process.env.PAYSTACK_SECRET_KEY);
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new PaymentProviderError(this.id, "PAYSTACK_SECRET_KEY manquant");

    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.customerEmail ?? "client@melokado.app",
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        reference: input.orderId,
        callback_url: input.returnUrl,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!res.ok || !data.status) {
      throw new PaymentProviderError(this.id, `Échec initialisation: ${data.message ?? res.status}`);
    }

    return {
      providerId: this.id,
      providerReference: data.data?.reference ?? input.orderId,
      checkoutUrl: data.data?.authorization_url,
      status: "INITIATED",
    };
  }

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new PaymentProviderError(this.id, "PAYSTACK_SECRET_KEY manquant");

    const res = await fetch(`${PAYSTACK_API}/transaction/verify/${providerReference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = (await res.json().catch(() => ({}))) as {
      data?: { status?: string; amount?: number; currency?: string };
    };

    if (!res.ok) throw new PaymentProviderError(this.id, `Échec vérification: HTTP ${res.status}`);

    return {
      providerReference,
      status: mapPaystackStatus(data.data?.status),
      amount: (data.data?.amount ?? 0) / 100,
      currency: data.data?.currency ?? "NGN",
      rawPayload: data,
    };
  }

  async parseWebhook(payload: unknown): Promise<PaymentVerificationResult> {
    // TODO avant prod: vérifier l'en-tête x-paystack-signature (HMAC SHA512 avec la clé secrète)
    const event = payload as { data?: { reference?: string } };
    const reference = event.data?.reference;
    if (!reference) throw new PaymentProviderError(this.id, "Webhook Paystack invalide");
    return this.verifyPayment(reference);
  }
}
