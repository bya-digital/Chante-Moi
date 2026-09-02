export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethod =
  | "orange_money"
  | "mtn_momo"
  | "moov_money"
  | "wave"
  | "card"
  | "paypal";

export interface PaymentIntentInput {
  /** ID interne de la commande (orders.id) — utilisé comme référence externe */
  orderId: string;
  amount: number;
  currency: string;
  countryCode: string;
  method?: PaymentMethod;
  description: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentIntentResult {
  providerId: string;
  /** Référence donnée par le provider — à stocker dans payment_attempts.provider_reference */
  providerReference: string;
  /** URL de paiement à rediriger le client vers (checkout hébergé) */
  checkoutUrl?: string;
  status: PaymentStatus;
}

export interface PaymentVerificationResult {
  providerReference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  rawPayload?: unknown;
}

/**
 * Interface que tout provider de paiement doit implémenter. AUCUN paiement n'est jamais
 * considéré réussi sur la seule base du retour frontend — toujours via verifyPayment() côté
 * serveur (webhook ou poll), avec idempotence sur providerReference (section 16-17-68).
 */
export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  /** Pays ISO-3166 alpha-2 où ce provider est disponible */
  readonly supportedCountries: string[];
  readonly supportedMethods: PaymentMethod[];

  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  /** Vérification active (polling) — complément du webhook, jamais la seule source de vérité si un webhook existe */
  verifyPayment(providerReference: string): Promise<PaymentVerificationResult>;
  /**
   * Valide la signature/authenticité d'un webhook et retourne l'état qu'il rapporte.
   * Doit rejeter (throw) toute requête non authentifiée.
   */
  parseWebhook(payload: unknown, headers: Record<string, string>): Promise<PaymentVerificationResult>;

  isConfigured(): boolean;
}

export class PaymentProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[PaymentProvider:${providerId}] ${message}`);
    this.name = "PaymentProviderError";
  }
}

/** NON IMPLÉMENTÉ — voir providers/README.md avant d'activer en production */
export class UnverifiedPaymentProvider implements PaymentProvider {
  constructor(
    readonly id: string,
    readonly displayName: string,
    readonly supportedCountries: string[],
    readonly supportedMethods: PaymentMethod[],
    private readonly envKeyNames: string[],
  ) {}

  isConfigured(): boolean {
    return this.envKeyNames.every((k) => Boolean(process.env[k]));
  }

  async createPaymentIntent(): Promise<PaymentIntentResult> {
    throw new PaymentProviderError(
      this.id,
      "Intégration non vérifiée contre la documentation officielle — voir src/services/payment/providers/README.md",
    );
  }

  async verifyPayment(): Promise<PaymentVerificationResult> {
    throw new PaymentProviderError(this.id, "Intégration non vérifiée — voir README.md");
  }

  async parseWebhook(): Promise<PaymentVerificationResult> {
    throw new PaymentProviderError(this.id, "Intégration non vérifiée — voir README.md");
  }
}
