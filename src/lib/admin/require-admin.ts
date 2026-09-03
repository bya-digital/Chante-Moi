import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie que l'utilisateur courant est admin (table admin_users, section 37) avant de rendre
 * une page admin. Redirige plutôt que d'afficher un message d'erreur discret — une page admin
 * sans garde est atteignable par URL directe (voir feedback_eglise_app_ui_gating_role_reel).
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?next=/admin");

  const { data: adminRow } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle();
  if (!adminRow) redirect("/");

  return { user, role: adminRow.role as "admin" | "superadmin" };
}
