import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Fetch actor details from public.users for notifications with actor_id
    const actorIds = [
      ...new Set(
        (notifications || [])
          .map((n: any) => n.actor_id)
          .filter(Boolean)
      ),
    ];

    let actorMap: Record<string, { id: string; name: string; avatar_url: string | null }> = {};
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .in("id", actorIds);

      if (actors) {
        for (const actor of actors) {
          actorMap[actor.id] = actor;
        }
      }
    }

    // Attach actor data to each notification
    const enriched = (notifications || []).map((n: any) => ({
      ...n,
      actor: n.actor_id ? actorMap[n.actor_id] || null : null,
    }));

    return NextResponse.json({ notifications: enriched });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_GET]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (notificationId) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;
      return NextResponse.json({ message: "Notification marked as read" });
    }

    return NextResponse.json(
      { error: "Provide notificationId or markAllRead" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[NOTIFICATIONS_PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notifications" },
      { status: 500 }
    );
  }
}
