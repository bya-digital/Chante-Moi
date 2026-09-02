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

const CINETPAY_PAYMENT_URL = "https://api-checkout.cinetpay.com/v2/payment";
const CINETPAY_CHECK_URL = "https://api-checkout.cinetpay.com/v2/payment/check";

/**
 * IMPORTANT — implémentation basée sur la documentation publique CinetPay Checkout v2 connue
 * au moment de l'écriture (apikey/site_id, endpoint /v2/payment, vérification /v2/payment/check).
 * AVANT toute mise en production: comparer ces champs à la documentation CinetPay à jour
 * (https://docs.cinetpay.com) et tester en environnement sandbox — les agrégateurs de paiement
 * africains changent leurs contrats d'API sans préavis long. CinetPay est l'agrégateur
 * prioritaire (Côte d'Ivoire + zone UEMOA), donc le premier à valider en conditions réelles.
 */
function mapCinetpayStatus(cpmStatus: string | undefined): PaymentStatus {
  switch (cpmStatus) {
    case "ACCEPTED":
      return "SUCCESS";
    case "REFUSED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    case "PENDING":
    case "WAITING_CUSTOMER_ACTION":
      return "PENDING";
    default:
      return "PENDING";
  }
}

export class CinetPayProvider implements PaymentProvider {
  readonly id = "cinetpay";
  readonly displayName = "CinetPay";
  readonly supportedCountries = ["CI", "SN", "BJ", "TG", "BF", "ML", "CM", "GA", "CD"];
  readonly supportedMethods: PaymentMethod[] = ["orange_money", "mtn_momo", "moov_money", "wave", "card"];

  isConfigured(): boolean {
    return Boolean(
      process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID,
    );
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const apikey = process.env.CINETPAY_API_KEY;
    const site_id = process.env.CINETPAY_SITE_ID;
    if (!apikey || !site_id) throw new PaymentProviderError(this.id, "Clés CinetPay manquantes");

    const res = await fetch(CINETPAY_PAYMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey,
        site_id,
        transaction_id: input.orderId,
        amount: Math.round(input.amount),
        currency: input.currency,
        description: input.description,
        notify_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/webhook/cinetpay`,
        return_url: input.returnUrl,
        channels: "ALL",
        customer_email: input.customerEmail,
        customer_phone_number: input.customerPhone,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      data?: { payment_url?: string; payment_token?: string };
    };

    if (!res.ok || data.code !== "201") {
      throw new PaymentProviderError(
        this.id,
        `Échec création paiement: ${data.message ?? res.status}`,
      );
    }

    return {
      providerId: this.id,
      providerReference: input.orderId,
      checkoutUrl: data.data?.payment_url,
      status: "INITIATED",
    };
  }

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const apikey = process.env.CINETPAY_API_KEY;
    const site_id = process.env.CINETPAY_SITE_ID;
    if (!apikey || !site_id) throw new PaymentProviderError(this.id, "Clés CinetPay manquantes");

    const res = await fetch(CINETPAY_CHECK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey, site_id, transaction_id: providerReference }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      data?: { status?: string; amount?: string; currency?: string };
    };

    if (!res.ok) {
      throw new PaymentProviderError(this.id, `Échec vérification: HTTP ${res.status}`);
    }

    return {
      providerReference,
      status: mapCinetpayStatus(data.data?.status),
      amount: Number(data.data?.amount ?? 0),
      currency: data.data?.currency ?? "XOF",
      rawPayload: data,
    };
  }

  async parseWebhook(payload: unknown): Promise<PaymentVerificationResult> {
    // CinetPay notifie via POST form-encoded avec cpm_trans_id — le webhook ne doit JAMAIS
    // être considéré comme la vérité seule : on rappelle systématiquement verifyPayment()
    // côté serveur pour confirmer (double-check anti-replay), voir /api/payments/webhook/cinetpay.
    const body = payload as { cpm_trans_id?: string };
    if (!body.cpm_trans_id) {
      throw new PaymentProviderError(this.id, "Webhook CinetPay invalide: cpm_trans_id manquant");
    }
    return this.verifyPayment(body.cpm_trans_id);
  }
}
