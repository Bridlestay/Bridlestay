import { createServiceClient } from "@/lib/supabase/service";

export type NotificationType =
  | "message"
  | "message_reply"
  | "route_comment"
  | "route_liked"
  | "route_completed"
  | "route_review"
  | "suggestion_received"
  | "suggestion_photo"
  | "suggestion_approved"
  | "suggestion_rejected"
  | "hazard_reported"
  | "booking_request"
  | "booking_accepted"
  | "booking_declined"
  | "booking_cancelled"
  | "payment_received"
  | "refund_processed"
  | "listing_review"
  | "listing_approved"
  | "report_filed"
  | "host_application"
  | "damage_claim";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
}

/**
 * Create a notification for a user.
 * Uses service client to bypass RLS (server-side only).
 * Silently fails — notifications should never block primary operations.
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
  actorId,
}: CreateNotificationParams): Promise<void> {
  try {
    // Don't notify a user about their own actions
    if (actorId && actorId === userId) return;

    const supabase = createServiceClient();
    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body: body || null,
      link: link || null,
      actor_id: actorId || null,
    });
  } catch {
    // Silent fail — never block primary operation for a notification
  }
}

/**
 * Create notifications for multiple users at once.
 */
export async function createNotifications(
  notifications: CreateNotificationParams[]
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const rows = notifications
      .filter((n) => !n.actorId || n.actorId !== n.userId)
      .map((n) => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        body: n.body || null,
        link: n.link || null,
        actor_id: n.actorId || null,
      }));
    if (rows.length > 0) {
      await supabase.from("notifications").insert(rows);
    }
  } catch {
    // Silent fail
  }
}
