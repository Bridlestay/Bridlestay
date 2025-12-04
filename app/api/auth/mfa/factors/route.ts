import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's MFA factors
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error("MFA list factors error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return only verified (active) TOTP factors
    const activeFactors = data.totp.filter(
      (factor) => factor.status === "verified"
    );

    return NextResponse.json({
      factors: activeFactors,
      hasMFA: activeFactors.length > 0,
    });
  } catch (error: any) {
    console.error("MFA list factors error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list MFA factors" },
      { status: 500 }
    );
  }
}

