import "server-only";
import { ResendEmailProvider } from "./email-provider";
import { WhatsAppProvider } from "./whatsapp-provider";
import type { NotificationInput } from "./types";

/**
 * Point d'entrée UNIQUE pour les notifications. Envoie sur tous les canaux configurés et
 * pertinents pour l'input (email si toEmail fourni, whatsapp si toPhone fourni) — n'échoue pas
 * l'un si l'autre réussit, chaque échec est catché et loggé séparément par l'appelant.
 */
export class NotificationManager {
  private email = new ResendEmailProvider();
  private whatsapp = new WhatsAppProvider();

  async send(input: NotificationInput): Promise<{ email?: boolean; whatsapp?: boolean }> {
    const results: { email?: boolean; whatsapp?: boolean } = {};

    if (input.toEmail && this.email.isConfigured()) {
      try {
        await this.email.send(input);
        results.email = true;
      } catch {
        results.email = false;
      }
    }

    if (input.toPhone && this.whatsapp.isConfigured()) {
      try {
        await this.whatsapp.send(input);
        results.whatsapp = true;
      } catch {
        results.whatsapp = false;
      }
    }

    return results;
  }
}
