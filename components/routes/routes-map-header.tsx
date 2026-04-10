"use client";

import { useEffect, useState } from "react";
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

export function RoutesMapHeader() {
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setUser(userData);
      }
    };

    getUser();
  }, []);

  // Fetch unread message count
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
    <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
      {/* Hamburger Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="h-10 w-10 bg-white shadow-lg border relative">
            <Menu className="h-5 w-5" />
            {(unreadCount > 0 || notifCount > 0) && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <UserDropdownMenu
          user={user}
          unreadCount={unreadCount}
          notifCount={notifCount}
          align="start"
          showHomeLink
        />
      </DropdownMenu>


      {/* Profile Picture */}
      {user && (
        <Link href="/profile">
          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity bg-white shadow-lg border">
            <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}
    </div>
  );
}

