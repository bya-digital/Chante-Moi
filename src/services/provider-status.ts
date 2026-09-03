import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderStatusChecker } from "./ai/manager";

/**
 * Implémentation réelle du kill switch admin (table provider_configs, section 19/38) : un
 * provider désactivé depuis /admin n'est plus jamais utilisé par aucun Manager. Sans ce
 * checker, les Managers utilisent un stub "toujours actif" — c'est le cas par défaut si un
 * appelant ne le fournit pas, donc bien penser à l'injecter dans chaque route qui instancie un
 * Manager (voir tous les `new XxxManager(providers, dbProviderStatusChecker())`).
 */
export function dbProviderStatusChecker(): ProviderStatusChecker {
  return {
    async isActive(providerId: string): Promise<boolean> {
      const admin = createAdminClient();
      const { data } = await admin.from("provider_configs").select("active").eq("id", providerId).maybeSingle();
      // Un provider absent de la table (pas encore seedé) reste actif par défaut plutôt que de
      // bloquer silencieusement une intégration qu'un admin n'a pas encore eu le temps d'enregistrer.
      return data ? data.active : true;
    },
  };
}
