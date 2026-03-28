"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { UserDropdownMenu } from "@/components/user-dropdown-menu";

export function MobileTopHeader() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        setUser(userData);
      }
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/messages/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    const fetchNotifCount = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count");
        if (response.ok) {
          const data = await response.json();
          setNotifCount(data.count || 0);
        }
      } catch { /* Non-critical */ }
    };
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden pointer-events-none">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 relative pointer-events-auto h-10 w-10 rounded-full bg-white shadow-md hover:bg-gray-50">
                <Menu className="h-5 w-5" />
                {(unreadCount > 0 || notifCount > 0) && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <UserDropdownMenu
              user={user}
              unreadCount={unreadCount}
              notifCount={notifCount}
              align="start"
              showRoutesLink
            />
          </DropdownMenu>

          {/* Profile Picture */}
          {loading ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0 pointer-events-auto shadow-md" />
          ) : user ? (
            <Link href="/profile" className="shrink-0 pointer-events-auto">
              <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-md">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/auth/sign-in" className="shrink-0 pointer-events-auto">
              <Avatar className="h-10 w-10 cursor-pointer bg-white shadow-md">
                <AvatarFallback className="text-gray-500">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </header>

    </>
  );
}

