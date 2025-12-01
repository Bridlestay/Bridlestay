"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
import { PropertyWizard } from "@/components/host/property-wizard";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewPropertyPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const checkUserAndUpgrade = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/auth/sign-in");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!userData) {
        router.push("/");
        return;
      }

      // If user is a guest, upgrade them to host
      if (userData.role === "guest") {
        setUpgrading(true);
        try {
          const response = await fetch("/api/host/become", {
            method: "POST",
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to upgrade account");
          }

          toast({
            title: "Welcome to hosting!",
            description: "Your account has been upgraded to a host account.",
          });

          // Refresh user data
          const { data: updatedUserData } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single();

          setUser(updatedUserData);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
          });
          router.push("/host");
          return;
        } finally {
          setUpgrading(false);
        }
      } else if (userData.role === "host" || userData.role === "admin") {
        setUser(userData);
      } else {
        router.push("/");
        return;
      }

      setLoading(false);
    };

    checkUserAndUpgrade();
  }, []);

  if (loading || upgrading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-muted/30 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">
              {upgrading ? "Setting up your host account..." : "Loading..."}
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <PropertyWizard userId={user.id} />
      </main>
    </>
  );
}


