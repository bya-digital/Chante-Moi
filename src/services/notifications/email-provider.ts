import "server-only";
import type { NotificationInput, NotificationProvider } from "./types";
import { NotificationProviderError } from "./types";

const RESEND_API = "https://api.resend.com/emails";

/** API Resend — simple et bien documentée, choisie pour les emails transactionnels. */
export class ResendEmailProvider implements NotificationProvider {
  readonly id = "resend";
  readonly channel = "email" as const;

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  }

  async send(input: NotificationInput): Promise<{ success: boolean; providerMessageId?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new NotificationProviderError(this.id, "RESEND_API_KEY manquant");
    if (!input.toEmail) throw new NotificationProviderError(this.id, "toEmail manquant");

    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MeloKado <notifications@melokado.app>",
        to: [input.toEmail],
        subject: input.subject ?? "MeloKado",
        html: `<p>${input.message}</p>${input.actionUrl ? `<p><a href="${input.actionUrl}">Voir</a></p>` : ""}`,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    if (!res.ok) throw new NotificationProviderError(this.id, `HTTP ${res.status}`);

    return { success: true, providerMessageId: data.id };
  }
}
