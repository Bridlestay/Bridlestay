import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// Run daily to delete read notifications older than 30 days
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("read", true)
      .lt("created_at", thirtyDaysAgo.toISOString())
      .select("id");

    if (error) {
      console.error("[CLEANUP_NOTIFICATIONS] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedCount = data?.length || 0;
    console.log(
      `[CLEANUP_NOTIFICATIONS] Deleted ${deletedCount} read notifications older than 30 days`
    );

    return NextResponse.json({ deleted: deletedCount });
  } catch (error: any) {
    console.error("[CLEANUP_NOTIFICATIONS] Error:", error);
    return NextResponse.json(
      { error: "Failed to clean up notifications" },
      { status: 500 }
    );
  }
}
