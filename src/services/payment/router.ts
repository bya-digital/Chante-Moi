import "server-only";
import { getAllPaymentProviders } from "./registry";
import type { PaymentMethod, PaymentProvider } from "./types";
import type { ProviderStatusChecker } from "../ai/manager";

export interface RoutingContext {
  countryCode: string;
  method?: PaymentMethod;
  /** Ordre de priorité admin, ex. ["cinetpay", "flutterwave", "stripe"] — voir table settings */
  priorityOrder?: string[];
}

const alwaysActive: ProviderStatusChecker = { isActive: async () => true };

/**
 * Choisit le(s) provider(s) éligibles pour un contexte donné (pays/méthode), triés par
 * priorité admin. Le client ne connaît jamais cette logique (section 15) : PaymentManager
 * essaie chaque candidat dans l'ordre jusqu'au premier succès de création d'intent.
 */
export class PaymentRouter {
  private statusChecker: ProviderStatusChecker;

  constructor(statusChecker?: ProviderStatusChecker) {
    this.statusChecker = statusChecker ?? alwaysActive;
  }

  async eligibleProviders(ctx: RoutingContext): Promise<PaymentProvider[]> {
    const all = getAllPaymentProviders();

    const matches = all.filter((p) => {
      if (!p.isConfigured()) return false;
      const countryOk = p.supportedCountries.includes("*") || p.supportedCountries.includes(ctx.countryCode);
      const methodOk = !ctx.method || p.supportedMethods.includes(ctx.method);
      return countryOk && methodOk;
    });

    const active: PaymentProvider[] = [];
    for (const p of matches) {
      if (await this.statusChecker.isActive(p.id)) active.push(p);
    }

    if (ctx.priorityOrder?.length) {
      const order = ctx.priorityOrder;
      active.sort((a, b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
      });
    }

    return active;
  }
}
