import "server-only";
import { PaymentRouter, type RoutingContext } from "./router";
import { getAllPaymentProviders } from "./registry";
import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentVerificationResult,
} from "./types";
import { PaymentProviderError } from "./types";
import type { ProviderStatusChecker } from "../ai/manager";

/**
 * Point d'entrée UNIQUE pour les paiements. Wave -> Provider A -> échec -> Provider B (section 15)
 * est géré ici via PaymentRouter ; le frontend n'appelle jamais un provider directement.
 */
export class PaymentManager {
  private router: PaymentRouter;

  constructor(statusChecker?: ProviderStatusChecker) {
    this.router = new PaymentRouter(statusChecker);
  }

  async createPaymentIntent(
    input: PaymentIntentInput,
    ctx: RoutingContext,
  ): Promise<PaymentIntentResult & { attemptedProviders: string[] }> {
    const candidates = await this.router.eligibleProviders(ctx);
    if (candidates.length === 0) {
      throw new PaymentProviderError(
        "payment-manager",
        `Aucun provider de paiement disponible pour ${ctx.countryCode}/${ctx.method ?? "toute méthode"}`,
      );
    }

    const attempted: string[] = [];
    let lastError: unknown;
    for (const provider of candidates) {
      attempted.push(provider.id);
      try {
        const result = await provider.createPaymentIntent(input);
        return { ...result, attemptedProviders: attempted };
      } catch (err) {
        lastError = err;
      }
    }

    throw new PaymentProviderError(
      "payment-manager",
      `Tous les providers ont échoué (${attempted.join(", ")})`,
      lastError,
    );
  }

  async verifyPayment(providerId: string, providerReference: string): Promise<PaymentVerificationResult> {
    const provider = getAllPaymentProviders().find((p) => p.id === providerId);
    if (!provider) throw new PaymentProviderError("payment-manager", `Provider inconnu: ${providerId}`);
    return provider.verifyPayment(providerReference);
  }

  async parseWebhook(
    providerId: string,
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<PaymentVerificationResult> {
    const provider = getAllPaymentProviders().find((p) => p.id === providerId);
    if (!provider) throw new PaymentProviderError("payment-manager", `Provider inconnu: ${providerId}`);
    return provider.parseWebhook(payload, headers);
  }
}
