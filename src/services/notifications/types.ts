export type NotificationEvent =
  | "payment_confirmed"
  | "generation_started"
  | "generation_completed"
  | "generation_failed"
  | "credit_added"
  | "credit_used";

export interface NotificationInput {
  event: NotificationEvent;
  toEmail?: string;
  toPhone?: string;
  subject?: string;
  message: string;
  /** Lien vers la page cadeau/résultat si applicable */
  actionUrl?: string;
}

export interface NotificationProvider {
  readonly id: string;
  readonly channel: "email" | "whatsapp" | "push";
  send(input: NotificationInput): Promise<{ success: boolean; providerMessageId?: string }>;
  isConfigured(): boolean;
}

export class NotificationProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[NotificationProvider:${providerId}] ${message}`);
    this.name = "NotificationProviderError";
  }
}
