import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin User Actions API
 * 
 * Provides admin-only user management capabilities:
 * - send_password_reset: Send a password reset email to the user
 * - send_magic_link: Send a passwordless login link to the user
 * - impersonate: Generate an impersonation session (audit logged)
 * 
 * All actions are audit logged for security and compliance.
 */

// Create admin client with service role for privileged operations
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the requesting user is authenticated and is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { action, targetUserId } = body;

    if (!action || !targetUserId) {
      return NextResponse.json({ error: "Missing action or targetUserId" }, { status: 400 });
    }

    // Get target user details
    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const adminSupabase = getAdminSupabase();

    // Log the admin action
    const logAdminAction = async (actionType: string, details: Record<string, any>) => {
      try {
        await supabase.from("admin_audit_log").insert({
          admin_id: user.id,
          admin_name: adminUser.name,
          action_type: actionType,
          target_user_id: targetUserId,
          target_user_email: targetUser.email,
          details: details,
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        // Don't fail the action if logging fails, but log to console
        console.error("Failed to log admin action:", logError);
      }
    };

    switch (action) {
      case "send_password_reset": {
        // Send password reset email
        const { error } = await adminSupabase.auth.resetPasswordForEmail(
          targetUser.email,
          {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
          }
        );

        if (error) {
          console.error("Password reset error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await logAdminAction("password_reset_sent", {
          targetEmail: targetUser.email,
        });

        return NextResponse.json({
          success: true,
          message: `Password reset email sent to ${targetUser.email}`,
        });
      }

      case "send_magic_link": {
        // Send magic link for passwordless login
        const { error } = await adminSupabase.auth.signInWithOtp({
          email: targetUser.email,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          },
        });

        if (error) {
          console.error("Magic link error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await logAdminAction("magic_link_sent", {
          targetEmail: targetUser.email,
        });

        return NextResponse.json({
          success: true,
          message: `Magic link sent to ${targetUser.email}`,
        });
      }

      case "impersonate": {
        // Generate impersonation link
        // This creates a magic link that the admin can use to log in as the user
        // The impersonation is audit logged
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        
        const { data, error } = await adminSupabase.auth.admin.generateLink({
          type: "magiclink",
          email: targetUser.email,
          options: {
            redirectTo: `${appUrl}/dashboard`,
          },
        });

        if (error) {
          console.error("Impersonation error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // The action_link is at data.properties.action_link
        const actionLink = data?.properties?.action_link;
        
        if (!actionLink) {
          console.error("No action link returned. Data:", JSON.stringify(data, null, 2));
          return NextResponse.json({ 
            error: "Failed to generate impersonation link. Check server logs." 
          }, { status: 500 });
        }

        await logAdminAction("user_impersonated", {
          targetEmail: targetUser.email,
          targetRole: targetUser.role,
          impersonationTime: new Date().toISOString(),
        });

        // Encode the magic link to pass through our impersonation handler
        const encodedLink = encodeURIComponent(actionLink);
        const impersonationUrl = `${appUrl}/auth/impersonate?magicLink=${encodedLink}`;

        // Return the impersonation URL that will sign out first, then use the magic link
        return NextResponse.json({
          success: true,
          message: `Impersonation link generated for ${targetUser.name || targetUser.email}`,
          impersonationUrl: impersonationUrl,
          warning: "This action has been logged. You will be logged in as this user.",
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin user action error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to perform action" },
      { status: 500 }
    );
  }
}

