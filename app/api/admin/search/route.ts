import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const query = searchParams.get("query");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!type || !query) {
      return NextResponse.json({ error: "Type and query required" }, { status: 400 });
    }

    let results: any[] = [];

    if (type === "users") {
      // Search users by name, email, or ID
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, avatar_url, role, admin_verified, banned, created_at")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,id.eq.${query}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        // If the ID search fails (invalid UUID), retry without it
        const { data: retryData } = await supabase
          .from("users")
          .select("id, name, email, avatar_url, role, admin_verified, banned, created_at")
          .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
          .order("created_at", { ascending: false })
          .limit(20);
        results = retryData || [];
      } else {
        results = data || [];
      }
    } else if (type === "properties") {
      // Search properties by name, location, or ID
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, city, county, published, admin_verified, removed, created_at")
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,county.ilike.%${query}%,id.eq.${query}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        // If the ID search fails (invalid UUID), retry without it
        const { data: retryData } = await supabase
          .from("properties")
          .select("id, name, city, county, published, admin_verified, removed, created_at")
          .or(`name.ilike.%${query}%,city.ilike.%${query}%,county.ilike.%${query}%`)
          .order("created_at", { ascending: false })
          .limit(20);
        results = retryData || [];
      } else {
        results = data || [];
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search" },
      { status: 500 }
    );
  }
}

