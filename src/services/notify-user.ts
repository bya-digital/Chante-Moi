import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationManager } from "./notifications/manager";
import type { NotificationEvent } from "./notifications/types";

/**
 * Envoie une notification à un utilisateur pour un événement donné (section 32) et journalise
 * le résultat dans la table notifications. Best-effort : ne fait jamais échouer l'appelant
 * (paiement, génération) si l'envoi échoue — juste loggé.
 */
export async function notifyUser(params: {
  userId: string;
  event: NotificationEvent;
  subject: string;
  message: string;
  actionUrl?: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: authUser } = await admin.auth.admin.getUserById(params.userId);
  const email = authUser?.user?.email;
  if (!email) return;

  const { data: profile } = await admin.from("profiles").select("phone").eq("id", params.userId).maybeSingle();

  const notificationManager = new NotificationManager();
  const results = await notificationManager.send({
    event: params.event,
    toEmail: email,
    toPhone: profile?.phone ?? undefined,
    subject: params.subject,
    message: params.message,
    actionUrl: params.actionUrl,
  });

  const rows = Object.entries(results).map(([channel, success]) => ({
    user_id: params.userId,
    event: params.event,
    channel,
    status: success ? "sent" : "failed",
  }));
  if (rows.length > 0) await admin.from("notifications").insert(rows);
}
