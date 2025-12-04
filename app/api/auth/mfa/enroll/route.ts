import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enroll the user in TOTP MFA
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    if (error) {
      console.error("MFA enroll error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return the QR code and secret for the user to set up their authenticator app
    return NextResponse.json({
      id: data.id,
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  } catch (error: any) {
    console.error("MFA enroll error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enroll in MFA" },
      { status: 500 }
    );
  }
}

