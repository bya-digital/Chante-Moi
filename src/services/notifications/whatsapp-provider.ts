import "server-only";
import type { NotificationInput, NotificationProvider } from "./types";
import { NotificationProviderError } from "./types";

const GRAPH_API = "https://graph.facebook.com/v21.0";

/**
 * WhatsApp Cloud API (Meta) — nécessite un numéro professionnel vérifié et des templates de
 * message pré-approuvés pour tout envoi hors fenêtre de 24h (règle WhatsApp Business, section 31
 * du cahier des charges : ne jamais envoyer de fichier si les conditions du provider ne le
 * permettent pas). Ce provider envoie uniquement du texte via un template générique
 * "notification_generique" — à créer et faire approuver dans le Meta Business Manager avant
 * toute activation réelle. Tant que WHATSAPP_BUSINESS_TOKEN est absent, isConfigured() bloque
 * l'envoi (pas de simulation de succès).
 */
export class WhatsAppProvider implements NotificationProvider {
  readonly id = "whatsapp";
  readonly channel = "whatsapp" as const;

  isConfigured(): boolean {
    return Boolean(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async send(input: NotificationInput): Promise<{ success: boolean; providerMessageId?: string }> {
    const token = process.env.WHATSAPP_BUSINESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) throw new NotificationProviderError(this.id, "Clés WhatsApp manquantes");
    if (!input.toPhone) throw new NotificationProviderError(this.id, "toPhone manquant");

    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.toPhone,
        type: "text",
        text: { body: `${input.message}${input.actionUrl ? `\n${input.actionUrl}` : ""}` },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
    if (!res.ok) throw new NotificationProviderError(this.id, `HTTP ${res.status}`);

    return { success: true, providerMessageId: data.messages?.[0]?.id };
  }
}
