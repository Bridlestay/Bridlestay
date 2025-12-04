import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { factorId } = await request.json();

    if (!factorId) {
      return NextResponse.json(
        { error: "Factor ID is required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unenroll the factor
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      console.error("MFA unenroll error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been disabled",
    });
  } catch (error: any) {
    console.error("MFA unenroll error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disable MFA" },
      { status: 500 }
    );
  }
}

