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

/**
 * MODÈLE À COPIER — étapes pour brancher un vrai agrégateur dès que vous avez son accès API :
 *
 * 1. Copier ce fichier vers `<provider-id>.ts` (ex. `chariow.ts`).
 * 2. Lire sa documentation officielle à jour (section 67 du cahier des charges — ne jamais
 *    deviner un endpoint/header). Noter : URL de création de paiement, méthode d'auth exacte
 *    (Bearer ? header custom comme xi-api-key ? apikey en body ?), format de la réponse,
 *    endpoint de vérification, mécanisme du webhook (signature, format du payload).
 * 3. Remplacer PROVIDER_ID/PROVIDER_URL/les 3 méthodes ci-dessous par l'implémentation réelle.
 * 4. Retirer l'entrée `UnverifiedPaymentProvider(...)` correspondante dans `registry.ts` et la
 *    remplacer par `new VotreProvider()`.
 * 5. Ajouter la vraie clé dans `.env.local` (jamais commitée) — `isConfigured()` doit déjà lire
 *    ce nom de variable dans `.env.example`.
 * 6. Smoke-test en sandbox avant toute mise en prod (jamais de paiement réel non testé).
 *
 * Aucune autre partie de l'app n'a besoin de changer : PaymentManager/PaymentRouter/le tunnel
 * de création parlent tous à l'interface PaymentProvider, jamais à un provider concret.
 */

const PROVIDER_URL = "https://api.example.com/v1/payment";

function mapStatus(rawStatus: string | undefined): PaymentStatus {
  switch (rawStatus) {
    case "success": // adapter aux valeurs réelles du provider
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export class TemplateProvider implements PaymentProvider {
  readonly id = "template"; // <- remplacer par l'id utilisé dans registry.ts et provider_configs
  readonly displayName = "Template";
  readonly supportedCountries: string[] = []; // ex. ["CI", "SN"]
  readonly supportedMethods: PaymentMethod[] = []; // ex. ["orange_money", "mtn_momo"]

  isConfigured(): boolean {
    return Boolean(process.env.TEMPLATE_API_KEY);
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const apiKey = process.env.TEMPLATE_API_KEY;
    if (!apiKey) throw new PaymentProviderError(this.id, "TEMPLATE_API_KEY manquant");

    const res = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`, // <- adapter au vrai schéma d'auth
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // <- adapter aux vrais champs attendus par le provider
        amount: input.amount,
        currency: input.currency,
        reference: input.orderId,
        return_url: input.returnUrl,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new PaymentProviderError(this.id, `HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as { payment_url?: string; reference?: string };

    return {
      providerId: this.id,
      providerReference: data.reference ?? input.orderId,
      checkoutUrl: data.payment_url,
      status: "INITIATED",
    };
  }

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const apiKey = process.env.TEMPLATE_API_KEY;
    if (!apiKey) throw new PaymentProviderError(this.id, "TEMPLATE_API_KEY manquant");

    // <- adapter à l'endpoint réel de vérification (URL, méthode, corps de requête)
    const res = await fetch(`${PROVIDER_URL}/${providerReference}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new PaymentProviderError(this.id, `Échec vérification: HTTP ${res.status}`);

    const data = (await res.json()) as { status?: string; amount?: number; currency?: string };
    return {
      providerReference,
      status: mapStatus(data.status),
      amount: data.amount ?? 0,
      currency: data.currency ?? "XOF",
      rawPayload: data,
    };
  }

  async parseWebhook(payload: unknown): Promise<PaymentVerificationResult> {
    // <- vérifier la signature du webhook avant de faire confiance au payload
    void payload;
    throw new PaymentProviderError(this.id, "Non implémenté");
  }
}
