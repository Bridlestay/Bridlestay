import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { DamageClaimsList } from "@/components/damage-claims/damage-claims-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function ClaimsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Get user's role to determine view
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isHost = userData?.role === "host";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-serif text-2xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0" />
              Damage & Cleaning Claims
            </h1>
            <p className="text-muted-foreground">
              {isHost 
                ? "Manage damage and excessive cleaning claims for your properties."
                : "View and respond to any claims made against your stays."
              }
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Claims</CardTitle>
              <CardDescription>
                {isHost 
                  ? "Claims you've filed after guest stays. You have 48 hours after checkout to submit a claim."
                  : "Claims filed by hosts for your stays. You can accept or dispute claims."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DamageClaimsList 
                userId={user.id} 
                role={isHost ? "host" : "guest"} 
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

