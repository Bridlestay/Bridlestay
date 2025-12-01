import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user data
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already a host or admin
    if (userData.role === "host" || userData.role === "admin") {
      return NextResponse.json(
        { error: "User is already a host", role: userData.role },
        { status: 400 }
      );
    }

    // Upgrade user to host
    const { error: updateError } = await supabase
      .from("users")
      .update({ role: "host" })
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Create host profile
    const { error: hostProfileError } = await supabase
      .from("host_profiles")
      .insert({
        user_id: user.id,
      });

    if (hostProfileError) throw hostProfileError;

    return NextResponse.json({ 
      success: true,
      message: "Successfully upgraded to host account" 
    });
  } catch (error: any) {
    console.error("Error upgrading to host:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upgrade account" },
      { status: 500 }
    );
  }
}

